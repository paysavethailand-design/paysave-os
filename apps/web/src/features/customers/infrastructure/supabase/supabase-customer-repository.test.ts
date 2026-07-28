import {
  encryptField,
  hashFieldForLookup,
  parseFieldEncryptionKey,
} from "@paysave/security/crypto";
import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { toByteaHex } from "./bytea-codec";
import { SupabaseCustomerRepository } from "./supabase-customer-repository";

const key = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);
const encryptedName = encryptField("Somchai Prasert", key);

const row = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partner_id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  customer_type: "individual",
  display_name_encrypted: toByteaHex(encryptedName.ciphertext),
  status: "active",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
  deleted_at: null,
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return {
    repository: new SupabaseCustomerRepository(client as unknown as SupabaseClient, key),
    client,
  };
}

describe("SupabaseCustomerRepository", () => {
  it("decrypts the display name when mapping a found row", async () => {
    const { repository } = repositoryWith([{ data: row, error: null }]);
    const customer = await repository.findById(row.id);
    expect(customer?.displayName).toBe("Somchai Prasert");
  });

  it("scopes list() to the given partner and excludes soft-deleted rows", async () => {
    const { repository, client } = repositoryWith([{ data: [row], error: null }]);
    await repository.list({ partnerId: row.partner_id, limit: 20, cursor: null });
    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toEqual([
      {
        method: "select",
        args: [
          "id, partner_id, customer_type, display_name_encrypted, status, created_at, updated_at, deleted_at",
        ],
      },
      { method: "eq", args: ["partner_id", row.partner_id] },
      { method: "is", args: ["deleted_at", null] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "limit", args: [21] },
    ]);
  });

  it("encrypts and hashes the display name on create", async () => {
    const { repository, client } = repositoryWith([{ data: row, error: null }]);
    await repository.create({
      partnerId: row.partner_id,
      customerType: "individual",
      displayName: "Somchai Prasert",
      status: "active",
    });

    const [builder] = client.recordedBuilders();
    const payload = builder?.recordedCalls()[0]?.args[0] as {
      display_name_encrypted: string;
      normalized_name_hash: string;
    };
    expect(payload.display_name_encrypted.startsWith("\\x")).toBe(true);
    expect(payload.normalized_name_hash).toBe(
      toByteaHex(hashFieldForLookup("Somchai Prasert", key)),
    );
  });

  it("soft-deletes via update, never delete", async () => {
    const { repository, client } = repositoryWith([
      { data: { ...row, deleted_at: "2026-07-22T00:00:00.000Z" }, error: null },
    ]);
    await repository.softDelete(row.id, {
      deletedAt: "2026-07-22T00:00:00.000Z",
      deletedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      deleteReason: "duplicate record",
    });
    const [builder] = client.recordedBuilders();
    const methods = builder?.recordedCalls().map((call) => call.method);
    expect(methods).toContain("update");
    expect(methods).not.toContain("delete");
  });
});
