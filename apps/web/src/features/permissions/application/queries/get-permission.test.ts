import { describe, expect, it } from "vitest";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";
import { getPermission } from "./get-permission";

const existing: Permission = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  code: "users.read",
  resource: "users",
  action: "read",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function fakeRepository(overrides: Partial<PermissionRepository> = {}): PermissionRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByCode: async () => null,
    create: async () => existing,
    update: async () => existing,
    ...overrides,
  };
}

describe("getPermission", () => {
  it("returns the permission when found", async () => {
    await expect(getPermission(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws a 404 ApiError when not found", async () => {
    await expect(
      getPermission("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
