import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseRoleRepository } from "./supabase-role-repository";

const row = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  partner_id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  template_id: null,
  code: "supervisor-l2",
  name: "Supervisor L2",
  status: "active",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
  deleted_at: null,
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return { repository: new SupabaseRoleRepository(client as unknown as SupabaseClient), client };
}

describe("SupabaseRoleRepository", () => {
  it("filters list() to the given partner and excludes soft-deleted rows", async () => {
    const { repository, client } = repositoryWith([{ data: [row], error: null }]);
    await repository.list({ partnerId: row.partner_id, limit: 20, cursor: null });

    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toEqual([
      {
        method: "select",
        args: [
          "id, partner_id, template_id, code, name, status, created_at, updated_at, deleted_at",
        ],
      },
      { method: "eq", args: ["partner_id", row.partner_id] },
      { method: "is", args: ["deleted_at", null] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "limit", args: [21] },
    ]);
  });

  it("maps a found row to the domain entity", async () => {
    const { repository } = repositoryWith([{ data: row, error: null }]);
    const role = await repository.findById(row.id);
    expect(role?.partnerId).toBe(row.partner_id);
    expect(role?.templateId).toBeNull();
  });

  it("soft-deletes via update, never a real delete call", async () => {
    const { repository, client } = repositoryWith([
      { data: { ...row, deleted_at: "2026-07-22T00:00:00.000Z" }, error: null },
    ]);
    await repository.softDelete(row.id, {
      deletedAt: "2026-07-22T00:00:00.000Z",
      deletedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      deleteReason: "duplicate",
    });

    const [builder] = client.recordedBuilders();
    const calledMethods = builder?.recordedCalls().map((call) => call.method);
    expect(calledMethods).toContain("update");
    expect(calledMethods).not.toContain("delete");
  });
});
