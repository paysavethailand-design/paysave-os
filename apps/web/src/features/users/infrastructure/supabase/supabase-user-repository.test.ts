import { encryptField, parseFieldEncryptionKey } from "@paysave/security/crypto";
import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { toByteaHex } from "./bytea-codec";
import { SupabaseUserRepository } from "./supabase-user-repository";

const key = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);
const encryptedName = encryptField("Somchai Prasert", key);

const row = {
  id: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  auth_subject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  display_name_encrypted: toByteaHex(encryptedName.ciphertext),
  status: "active",
  last_seen_at: "2026-07-22T00:00:00.000Z",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
  display_name_key_version: encryptedName.keyVersion,
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return {
    repository: new SupabaseUserRepository(client as unknown as SupabaseClient, key),
    client,
  };
}

describe("SupabaseUserRepository", () => {
  it("decrypts the display name when mapping a found row", async () => {
    const { repository } = repositoryWith([{ data: row, error: null }]);
    const user = await repository.findById(row.id);
    expect(user?.displayName).toBe("Somchai Prasert");
  });

  it("encrypts the display name and stamps lastSeenAt on create", async () => {
    const { repository, client } = repositoryWith([{ data: row, error: null }]);
    await repository.create({
      authSubject: row.auth_subject,
      displayName: "Somchai Prasert",
      status: "active",
      lastSeenAt: "2026-07-22T00:00:00.000Z",
    });

    const [builder] = client.recordedBuilders();
    const insertCall = builder?.recordedCalls()[0];
    expect(insertCall?.method).toBe("insert");
    const payload = insertCall?.args[0] as { display_name_encrypted: string; last_seen_at: string };
    expect(payload.display_name_encrypted.startsWith("\\x")).toBe(true);
    expect(payload.last_seen_at).toBe("2026-07-22T00:00:00.000Z");
  });

  it("returns null when a user is not found", async () => {
    const { repository } = repositoryWith([{ data: null, error: null }]);
    await expect(repository.findByAuthSubject(row.auth_subject)).resolves.toBeNull();
  });
});
