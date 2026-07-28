import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseRolePermissionRepository } from "./supabase-role-permission-repository";

const row = {
  id: "9a9a9a9a-2222-4d3d-9a1a-1111aaaa9999",
  partner_id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  role_id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  permission_id: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  effect: "allow",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return {
    repository: new SupabaseRolePermissionRepository(client as unknown as SupabaseClient),
    client,
  };
}

describe("SupabaseRolePermissionRepository", () => {
  it("lists grants scoped to partner and role", async () => {
    const { repository, client } = repositoryWith([{ data: [row], error: null }]);
    await repository.listByRole(row.partner_id, row.role_id);

    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toEqual([
      {
        method: "select",
        args: ["id, partner_id, role_id, permission_id, effect, created_at, updated_at"],
      },
      { method: "eq", args: ["partner_id", row.partner_id] },
      { method: "eq", args: ["role_id", row.role_id] },
      { method: "order", args: ["id", { ascending: true }] },
    ]);
  });

  it("creates a grant with the given partner/role/permission", async () => {
    const { repository, client } = repositoryWith([{ data: row, error: null }]);
    const created = await repository.create({
      partnerId: row.partner_id,
      roleId: row.role_id,
      permissionId: row.permission_id,
      effect: "allow",
    });

    expect(created.effect).toBe("allow");
    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()[0]).toEqual({
      method: "insert",
      args: [
        {
          partner_id: row.partner_id,
          role_id: row.role_id,
          permission_id: row.permission_id,
          effect: "allow",
        },
      ],
    });
  });

  it("has no method to delete a grant", () => {
    const { repository } = repositoryWith([]);
    expect((repository as unknown as { delete?: unknown }).delete).toBeUndefined();
  });
});
