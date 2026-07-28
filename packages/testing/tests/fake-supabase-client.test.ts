import { describe, expect, it } from "vitest";
import { FakeSupabaseClient } from "../src/fake-supabase-client";

describe("FakeSupabaseClient", () => {
  it("returns configured responses in call order and records chained filters", async () => {
    const client = new FakeSupabaseClient([
      { data: [{ id: "1" }], error: null },
      { data: { id: "2" }, error: null },
    ]);

    const first = await client
      .schema("iam")
      .from("permissions")
      .select("*")
      .eq("code", "users.read");
    const second = await client
      .schema("iam")
      .from("permissions")
      .insert({ code: "users.manage" })
      .single();

    expect(first).toEqual({ data: [{ id: "1" }], error: null });
    expect(second).toEqual({ data: { id: "2" }, error: null });

    const [builder1, builder2] = client.recordedBuilders();
    expect(builder1?.recordedCalls()).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["code", "users.read"] },
    ]);
    expect(builder2?.recordedCalls()).toEqual([
      { method: "insert", args: [{ code: "users.manage" }] },
      { method: "single", args: [] },
    ]);
  });

  it("defaults to an empty success response when more calls happen than configured", async () => {
    const client = new FakeSupabaseClient([]);
    const result = await client.schema("iam").from("permissions").select("*");
    expect(result).toEqual({ data: null, error: null });
  });
});
