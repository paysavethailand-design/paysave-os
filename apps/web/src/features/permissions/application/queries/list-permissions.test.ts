import { describe, expect, it } from "vitest";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";
import { listPermissions } from "./list-permissions";

function permission(id: string): Permission {
  return {
    id,
    code: `resource.action-${id}`,
    resource: "resource",
    action: `action-${id}`,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function fakeRepository(rows: readonly Permission[]): PermissionRepository {
  return {
    list: async () => rows,
    findById: async () => null,
    findByCode: async () => null,
    create: async () => permission("x"),
    update: async () => null,
  };
}

describe("listPermissions", () => {
  it("returns a bounded page without a next cursor when rows fit within the limit", async () => {
    const rows = [permission("1"), permission("2")];
    const page = await listPermissions({ limit: 2, cursor: null }, fakeRepository(rows));
    expect(page).toEqual({ items: rows, nextCursor: null });
  });

  it("trims the lookahead row and reports the next cursor", async () => {
    const rows = [permission("1"), permission("2"), permission("3")];
    const page = await listPermissions({ limit: 2, cursor: null }, fakeRepository(rows));
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("2");
  });
});
