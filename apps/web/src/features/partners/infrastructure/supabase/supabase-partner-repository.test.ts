import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabasePartnerRepository } from "./supabase-partner-repository";

const row = {
  id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  code: "acme-recovery",
  name: "ACME Recovery",
  status: "active",
  timezone: "Asia/Bangkok",
  default_currency: "THB",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
  deleted_at: null,
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return { repository: new SupabasePartnerRepository(client as unknown as SupabaseClient), client };
}

describe("SupabasePartnerRepository", () => {
  it("excludes soft-deleted rows from list()", async () => {
    const { repository, client } = repositoryWith([{ data: [row], error: null }]);
    await repository.list({ limit: 20, cursor: null });
    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toContainEqual({ method: "is", args: ["deleted_at", null] });
  });

  it("maps default_currency to defaultCurrency", async () => {
    const { repository } = repositoryWith([{ data: row, error: null }]);
    const partner = await repository.findById(row.id);
    expect(partner?.defaultCurrency).toBe("THB");
  });

  it("soft-deletes via update, never delete", async () => {
    const { repository, client } = repositoryWith([
      { data: { ...row, deleted_at: "2026-07-22T00:00:00.000Z" }, error: null },
    ]);
    await repository.softDelete(row.id, {
      deletedAt: "2026-07-22T00:00:00.000Z",
      deletedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      deleteReason: "merged",
    });
    const [builder] = client.recordedBuilders();
    const methods = builder?.recordedCalls().map((call) => call.method);
    expect(methods).toContain("update");
    expect(methods).not.toContain("delete");
  });
});
