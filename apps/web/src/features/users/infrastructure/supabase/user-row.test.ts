import { parseFieldEncryptionKey } from "@paysave/security/crypto";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { toInsertPayload, toUpdatePayload, toUser, userRowSchema } from "./user-row";

const key = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);

describe("toInsertPayload / toUser", () => {
  it("round-trips a plaintext display name through encryption and the row mapper", () => {
    const payload = toInsertPayload(
      {
        authSubject: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
        displayName: "Somchai Prasert",
        status: "active",
        lastSeenAt: "2026-07-22T00:00:00.000Z",
      },
      key,
    );

    expect(payload.auth_subject).toBe("0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111");
    expect(payload.display_name_encrypted.startsWith("\\x")).toBe(true);

    const row = userRowSchema.parse({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      auth_subject: payload.auth_subject,
      display_name_encrypted: payload.display_name_encrypted,
      status: payload.status,
      last_seen_at: payload.last_seen_at,
      created_at: "2026-07-22T00:00:00.000Z",
      updated_at: "2026-07-22T00:00:00.000Z",
      display_name_key_version: payload.display_name_key_version,
    });

    expect(toUser(row, key).displayName).toBe("Somchai Prasert");
  });
});

describe("toUpdatePayload", () => {
  it("omits display_name fields when displayName is not being changed", () => {
    expect(toUpdatePayload({ status: "suspended" }, key)).toEqual({ status: "suspended" });
  });

  it("re-encrypts when displayName changes", () => {
    const payload = toUpdatePayload({ displayName: "New Name" }, key);
    expect(payload.display_name_encrypted?.startsWith("\\x")).toBe(true);
    expect(payload.status).toBeUndefined();
  });
});
