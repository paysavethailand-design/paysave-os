import {
  decryptField,
  encryptField,
  hashFieldForLookup,
  type FieldEncryptionKey,
} from "@paysave/security/crypto";
import { z } from "zod";
import type { UpdateCustomerInput } from "../../application/dto/customer-schemas";
import type { NewCustomerRecord } from "../../application/ports/customer-repository";
import type { Customer } from "../../domain/entities/customer";
import { parseByteaHex, toByteaHex } from "./bytea-codec";

export const customerRowSchema = z.object({
  id: z.uuid(),
  partner_id: z.uuid(),
  customer_type: z.string(),
  display_name_encrypted: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type CustomerRow = z.infer<typeof customerRowSchema>;

/** Maps a validated `crm.customers` row into the domain entity, decrypting `display_name_encrypted`. */
export function toCustomer(row: CustomerRow, key: FieldEncryptionKey): Customer {
  return {
    id: row.id,
    partnerId: row.partner_id,
    customerType: row.customer_type,
    displayName: decryptField(parseByteaHex(row.display_name_encrypted), key),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Builds the `crm.customers` insert payload: encrypts `displayName` and derives the deterministic
 * `normalized_name_hash` lookup value required by the NOT NULL, 32-byte hash column.
 */
export function toInsertPayload(
  input: NewCustomerRecord,
  key: FieldEncryptionKey,
): {
  partner_id: string;
  customer_type: string;
  display_name_encrypted: string;
  normalized_name_hash: string;
  display_name_key_version: number;
  status: string;
} {
  const encrypted = encryptField(input.displayName, key);
  const nameHash = hashFieldForLookup(input.displayName, key);
  return {
    partner_id: input.partnerId,
    customer_type: input.customerType,
    display_name_encrypted: toByteaHex(encrypted.ciphertext),
    normalized_name_hash: toByteaHex(nameHash),
    display_name_key_version: encrypted.keyVersion,
    status: input.status,
  };
}

/** Builds the `crm.customers` update payload, re-encrypting `displayName`/re-hashing only when it changed. */
export function toUpdatePayload(
  input: UpdateCustomerInput,
  key: FieldEncryptionKey,
): Partial<{
  display_name_encrypted: string;
  normalized_name_hash: string;
  display_name_key_version: number;
  status: string;
}> {
  const payload: Partial<{
    display_name_encrypted: string;
    normalized_name_hash: string;
    display_name_key_version: number;
    status: string;
  }> = {};

  if (input.displayName !== undefined) {
    const encrypted = encryptField(input.displayName, key);
    payload.display_name_encrypted = toByteaHex(encrypted.ciphertext);
    payload.normalized_name_hash = toByteaHex(hashFieldForLookup(input.displayName, key));
    payload.display_name_key_version = encrypted.keyVersion;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }

  return payload;
}
