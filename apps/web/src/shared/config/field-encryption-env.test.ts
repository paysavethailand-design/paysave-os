import { describe, expect, it } from "vitest";
import { parseFieldEncryptionEnvironment } from "./field-encryption-env";

const validKey = Buffer.alloc(32, 7).toString("base64");

describe("parseFieldEncryptionEnvironment", () => {
  it("parses a valid base64 key with the default version", () => {
    expect(parseFieldEncryptionEnvironment({ PAYSAVE_FIELD_ENCRYPTION_KEY: validKey })).toEqual({
      fieldEncryptionKey: { version: 1, material: Buffer.alloc(32, 7) },
    });
  });

  it("parses an explicit key version", () => {
    expect(
      parseFieldEncryptionEnvironment({
        PAYSAVE_FIELD_ENCRYPTION_KEY: validKey,
        PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "3",
      }),
    ).toEqual({ fieldEncryptionKey: { version: 3, material: Buffer.alloc(32, 7) } });
  });

  it("rejects a missing or malformed key", () => {
    expect(() => parseFieldEncryptionEnvironment({})).toThrow();
    expect(() =>
      parseFieldEncryptionEnvironment({ PAYSAVE_FIELD_ENCRYPTION_KEY: "short" }),
    ).toThrow();
  });
});
