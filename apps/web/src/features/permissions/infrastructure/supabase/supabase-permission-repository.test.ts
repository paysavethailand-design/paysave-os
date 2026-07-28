import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabasePermissionRepository } from "./supabase-permission-repository";

const row = {
  id: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  code: "users.read",
  resource: "users",
  action: "read",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
};

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return {
    repository: new SupabasePermissionRepository(client as unknown as SupabaseClient),
    client,
  };
}

describe("SupabasePermissionRepository", () => {
  it("lists rows ordered ascending by id with a bounded limit", async () => {
    const { repository, client } = repositoryWith([{ data: [row], error: null }]);
    const result = await repository.list({ limit: 20, cursor: null });

    expect(result).toEqual([
      {
        id: row.id,
        code: row.code,
        resource: row.resource,
        action: row.action,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    ]);

    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toEqual([
      { method: "select", args: ["id, code, resource, action, created_at, updated_at"] },
      { method: "order", args: ["id", { ascending: true }] },
      { method: "limit", args: [21] },
    ]);
  });

  it("adds a keyset cursor filter when provided", async () => {
    const { repository, client } = repositoryWith([{ data: [], error: null }]);
    await repository.list({ limit: 10, cursor: row.id });

    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()).toContainEqual({ method: "gt", args: ["id", row.id] });
  });

  it("returns null when a permission is not found by id", async () => {
    const { repository } = repositoryWith([{ data: null, error: null }]);
    await expect(repository.findById(row.id)).resolves.toBeNull();
  });

  it("creates a permission and maps the returned row", async () => {
    const { repository, client } = repositoryWith([{ data: row, error: null }]);
    const created = await repository.create({
      code: "users.read",
      resource: "users",
      action: "read",
    });

    expect(created.id).toBe(row.id);
    const [builder] = client.recordedBuilders();
    expect(builder?.recordedCalls()[0]).toEqual({
      method: "insert",
      args: [{ code: "users.read", resource: "users", action: "read" }],
    });
  });

  it("throws when Supabase reports an error", async () => {
    const { repository } = repositoryWith([{ data: null, error: { message: "connection reset" } }]);
    await expect(repository.findById(row.id)).rejects.toThrow(/connection reset/);
  });
});
