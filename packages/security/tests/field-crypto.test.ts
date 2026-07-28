import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  decryptField,
  encryptField,
  hashFieldForLookup,
  parseFieldEncryptionKey,
} from "../src/field-crypto";

const key = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);

describe("parseFieldEncryptionKey", () => {
  it("rejects keys that do not decode to 32 bytes", () => {
    expect(() => parseFieldEncryptionKey(Buffer.from("short").toString("base64"), 1)).toThrow();
  });

  it("rejects a non-positive key version", () => {
    expect(() => parseFieldEncryptionKey(randomBytes(32).toString("base64"), 0)).toThrow();
  });
});

describe("encryptField / decryptField", () => {
  it("round-trips plaintext through ciphertext", () => {
    const encrypted = encryptField("Somchai Prasert", key);
    expect(encrypted.keyVersion).toBe(1);
    expect(decryptField(encrypted.ciphertext, key)).toBe("Somchai Prasert");
  });

  it("produces distinct ciphertext for identical plaintext (random IV)", () => {
    const first = encryptField("Somchai Prasert", key);
    const second = encryptField("Somchai Prasert", key);
    expect(first.ciphertext.equals(second.ciphertext)).toBe(false);
  });

  it("fails closed when the ciphertext is tampered with", () => {
    const encrypted = encryptField("Somchai Prasert", key);
    const tampered = Buffer.from(encrypted.ciphertext);
    tampered[tampered.length - 1] = (tampered[tampered.length - 1]! + 1) % 256;
    expect(() => decryptField(tampered, key)).toThrow();
  });

  it("fails closed when decrypted with the wrong key", () => {
    const encrypted = encryptField("Somchai Prasert", key);
    const otherKey = parseFieldEncryptionKey(randomBytes(32).toString("base64"), 1);
    expect(() => decryptField(encrypted.ciphertext, otherKey)).toThrow();
  });
});

describe("hashFieldForLookup", () => {
  it("returns a 32-byte deterministic hash", () => {
    const hash = hashFieldForLookup("Somchai Prasert", key);
    expect(hash).toHaveLength(32);
    expect(hashFieldForLookup("Somchai Prasert", key).equals(hash)).toBe(true);
  });

  it("normalizes case and surrounding whitespace before hashing", () => {
    const a = hashFieldForLookup("  Somchai Prasert  ", key);
    const b = hashFieldForLookup("somchai prasert", key);
    expect(a.equals(b)).toBe(true);
  });

  it("produces different hashes for different values", () => {
    const a = hashFieldForLookup("Somchai Prasert", key);
    const b = hashFieldForLookup("Somsak Prasert", key);
    expect(a.equals(b)).toBe(false);
  });
});
