/**
 * PostgREST/Supabase serialize `bytea` columns as Postgres's own hex text format
 * (`\x` followed by hex digits). This codec keeps that wire-format detail inside
 * Infrastructure so Application/Domain never see it.
 */
export function parseByteaHex(value: string): Buffer {
  if (!value.startsWith("\\x")) {
    throw new Error("Unexpected bytea encoding: missing \\x prefix");
  }
  return Buffer.from(value.slice(2), "hex");
}

export function toByteaHex(buffer: Buffer): string {
  return `\\x${buffer.toString("hex")}`;
}
