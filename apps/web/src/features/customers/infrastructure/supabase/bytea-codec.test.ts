import { describe, expect, it } from "vitest";
import { parseByteaHex, toByteaHex } from "./bytea-codec";

describe("bytea codec", () => {
  it("round-trips a buffer through the Postgres hex text format", () => {
    const buffer = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    expect(toByteaHex(buffer)).toBe("\\xdeadbeef");
    expect(parseByteaHex("\\xdeadbeef")).toEqual(buffer);
  });

  it("rejects a value without the \\x prefix", () => {
    expect(() => parseByteaHex("deadbeef")).toThrow();
  });
});
