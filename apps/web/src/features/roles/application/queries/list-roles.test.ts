import type { AuthContext } from "@paysave/security";
import { describe, expect, it, vi } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";
import { listRoles } from "./list-roles";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const tenantActor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["roles.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

const globalActor: AuthContext = { ...tenantActor, activePartnerId: null, tenantScope: "all" };

function role(id: string): Role {
  return {
    id,
    partnerId: activePartnerId,
    templateId: null,
    code: `role-${id}`,
    name: `Role ${id}`,
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
  };
}

describe("listRoles", () => {
  it("scopes the query to the tenant actor's active partner", async () => {
    const list = vi.fn().mockResolvedValue([role("1")]);
    const repository: RoleRepository = {
      list,
      findById: async () => null,
      findByCode: async () => null,
      create: async () => role("1"),
      update: async () => null,
      softDelete: async () => null,
    };

    await listRoles({ limit: 20, cursor: null }, null, tenantActor, repository);
    expect(list).toHaveBeenCalledWith({ partnerId: activePartnerId, limit: 20, cursor: null });
  });

  it("requires an explicit partnerId for a global admin", async () => {
    const repository: RoleRepository = {
      list: async () => [],
      findById: async () => null,
      findByCode: async () => null,
      create: async () => role("1"),
      update: async () => null,
      softDelete: async () => null,
    };

    await expect(
      listRoles({ limit: 20, cursor: null }, null, globalActor, repository),
    ).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
