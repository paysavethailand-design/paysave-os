import type { AuthContext } from "@paysave/security";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RolePermission } from "../../domain/entities/role-permission";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";
import { listRolePermissions } from "./list-role-permissions";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["roles.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

const role: Role = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  partnerId: activePartnerId,
  templateId: null,
  code: "supervisor-l2",
  name: "Supervisor L2",
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

const grants: readonly RolePermission[] = [
  {
    id: "9a9a9a9a-2222-4d3d-9a1a-1111aaaa9999",
    partnerId: activePartnerId,
    roleId: role.id,
    permissionId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
    effect: "allow",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  },
];

const roleRepository: RoleRepository = {
  list: async () => [],
  findById: async () => role,
  findByCode: async () => null,
  create: async () => role,
  update: async () => role,
  softDelete: async () => role,
};

const rolePermissionRepository: RolePermissionRepository = {
  listByRole: async () => grants,
  findByRoleAndPermission: async () => null,
  create: async () => grants[0]!,
};

describe("listRolePermissions", () => {
  it("returns the grants for a role the caller is authorized for", async () => {
    await expect(
      listRolePermissions(role.id, actor, roleRepository, rolePermissionRepository),
    ).resolves.toEqual(grants);
  });

  it("404s when the role does not exist", async () => {
    await expect(
      listRolePermissions(
        "missing",
        actor,
        { ...roleRepository, findById: async () => null },
        rolePermissionRepository,
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
