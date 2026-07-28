import { parseFieldEncryptionKey } from "@paysave/security/crypto";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { customerRowSchema, toCustomer, toInsertPayload, toUpdatePayload } from "./customer-row";

const key = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);

describe("toInsertPayload / toCustomer", () => {
  it("round-trips a plaintext display name through encryption and the row mapper", () => {
    const payload = toInsertPayload(
      {
        partnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
        customerType: "individual",
        displayName: "Somchai Prasert",
        status: "active",
      },
      key,
    );

    expect(payload.display_name_encrypted.startsWith("\\x")).toBe(true);
    expect(payload.normalized_name_hash.startsWith("\\x")).toBe(true);

    const row = customerRowSchema.parse({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      partner_id: payload.partner_id,
      customer_type: payload.customer_type,
      display_name_encrypted: payload.display_name_encrypted,
      status: payload.status,
      created_at: "2026-07-22T00:00:00.000Z",
      updated_at: "2026-07-22T00:00:00.000Z",
      deleted_at: null,
    });

    expect(toCustomer(row, key).displayName).toBe("Somchai Prasert");
  });
});

describe("toUpdatePayload", () => {
  it("omits display_name/hash fields when displayName is not being changed", () => {
    expect(toUpdatePayload({ status: "suspended" }, key)).toEqual({ status: "suspended" });
  });

  it("re-encrypts and re-hashes when displayName changes", () => {
    const payload = toUpdatePayload({ displayName: "New Name" }, key);
    expect(payload.display_name_encrypted?.startsWith("\\x")).toBe(true);
    expect(payload.normalized_name_hash?.startsWith("\\x")).toBe(true);
    expect(payload.status).toBeUndefined();
  });
});
