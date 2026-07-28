import { decryptField, encryptField, type FieldEncryptionKey } from "@paysave/security/crypto";
import { z } from "zod";
import type { User } from "../../domain/entities/user";
import type { NewUserRecord } from "../../application/ports/user-repository";
import type { UpdateUserInput } from "../../application/dto/user-schemas";
import { parseByteaHex, toByteaHex } from "./bytea-codec";

export const userRowSchema = z.object({
  id: z.uuid(),
  auth_subject: z.string(),
  display_name_encrypted: z.string(),
  status: z.string(),
  last_seen_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  display_name_key_version: z.number().int(),
});
export type UserRow = z.infer<typeof userRowSchema>;

/** Maps a validated `iam.users` row into the domain entity, decrypting `display_name_encrypted`. */
export function toUser(row: UserRow, key: FieldEncryptionKey): User {
  return {
    id: row.id,
    authSubject: row.auth_subject,
    displayName: decryptField(parseByteaHex(row.display_name_encrypted), key),
    status: row.status,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Builds the `iam.users` insert payload, encrypting `displayName` for `display_name_encrypted`. */
export function toInsertPayload(
  input: NewUserRecord,
  key: FieldEncryptionKey,
): {
  auth_subject: string;
  display_name_encrypted: string;
  display_name_key_version: number;
  status: string;
  last_seen_at: string;
} {
  const encrypted = encryptField(input.displayName, key);
  return {
    auth_subject: input.authSubject,
    display_name_encrypted: toByteaHex(encrypted.ciphertext),
    display_name_key_version: encrypted.keyVersion,
    status: input.status,
    last_seen_at: input.lastSeenAt,
  };
}

/** Builds the `iam.users` update payload, re-encrypting `displayName` only when it changed. */
export function toUpdatePayload(
  input: UpdateUserInput,
  key: FieldEncryptionKey,
): Partial<{
  display_name_encrypted: string;
  display_name_key_version: number;
  status: string;
}> {
  const payload: Partial<{
    display_name_encrypted: string;
    display_name_key_version: number;
    status: string;
  }> = {};

  if (input.displayName !== undefined) {
    const encrypted = encryptField(input.displayName, key);
    payload.display_name_encrypted = toByteaHex(encrypted.ciphertext);
    payload.display_name_key_version = encrypted.keyVersion;
  }
  if (input.status !== undefined) {
    payload.status = input.status;
  }

  return payload;
}
