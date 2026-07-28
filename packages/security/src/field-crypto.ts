/**
 * Uses `node:crypto`, so this module is exported from the separate `@paysave/security/crypto`
 * subpath rather than the root barrel (`@paysave/security`). Next.js middleware runs on the Edge
 * runtime and imports the root barrel (via `auth-context`/`authorization`); bundling `node:crypto`
 * into that graph breaks the Edge build even though middleware never calls these functions.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export interface FieldEncryptionKey {
  readonly version: number;
  readonly material: Buffer;
}

export interface EncryptedField {
  readonly ciphertext: Buffer;
  readonly keyVersion: number;
}

/** Decodes a base64 key and binds it to a key version for encrypted-at-rest PII columns. */
export function parseFieldEncryptionKey(
  base64Material: string,
  version: number,
): FieldEncryptionKey {
  if (!Number.isInteger(version) || version <= 0) {
    throw new Error("Field encryption key version must be a positive integer");
  }

  const material = Buffer.from(base64Material, "base64");
  if (material.length !== KEY_BYTES) {
    throw new Error(`Field encryption key must decode to ${KEY_BYTES} bytes`);
  }

  return { version, material };
}

/** Encrypts a plaintext field for storage in a `*_encrypted bytea` column using AES-256-GCM. */
export function encryptField(plaintext: string, key: FieldEncryptionKey): EncryptedField {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key.material, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: Buffer.concat([iv, authTag, encrypted]),
    keyVersion: key.version,
  };
}

/** Decrypts a ciphertext produced by {@link encryptField} using the matching key version. */
export function decryptField(ciphertext: Buffer, key: FieldEncryptionKey): string {
  const iv = ciphertext.subarray(0, IV_BYTES);
  const authTag = ciphertext.subarray(IV_BYTES, IV_BYTES + AUTH_TAG_BYTES);
  const encrypted = ciphertext.subarray(IV_BYTES + AUTH_TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key.material, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

/**
 * Produces the deterministic 32-byte HMAC-SHA256 lookup hash required by `*_hash bytea` columns
 * (e.g. `normalized_name_hash`, `value_hash`). Normalization keeps case/whitespace variants
 * resolvable to the same lookup value without exposing the plaintext.
 */
export function hashFieldForLookup(value: string, key: FieldEncryptionKey): Buffer {
  return createHmac("sha256", key.material).update(normalizeForHash(value)).digest();
}

function normalizeForHash(value: string): string {
  return value.trim().toLowerCase();
}
