import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RolePermission } from "../../domain/entities/role-permission";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";
import { detachRolePermission } from "./detach-role-permission";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const permissionId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["roles.manage"],
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

const grant: RolePermission = {
  id: "9a9a9a9a-2222-4d3d-9a1a-1111aaaa9999",
  partnerId: activePartnerId,
  roleId: role.id,
  permissionId,
  effect: "allow",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function fakeRoleRepository(overrides: Partial<RoleRepository> = {}): RoleRepository {
  return {
    list: async () => [],
    findById: async () => role,
    findByCode: async () => null,
    create: async () => role,
    update: async () => role,
    softDelete: async () => role,
    ...overrides,
  };
}

function fakeRolePermissionRepository(
  overrides: Partial<RolePermissionRepository> = {},
): RolePermissionRepository {
  return {
    listByRole: async () => [],
    findByRoleAndPermission: async () => grant,
    create: async () => grant,
    ...overrides,
  };
}

describe("detachRolePermission", () => {
  it("404s when the role does not exist", async () => {
    await expect(
      detachRolePermission(
        role.id,
        permissionId,
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository({ findById: async () => null }),
          rolePermissionRepository: fakeRolePermissionRepository(),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("404s when the grant does not exist", async () => {
    await expect(
      detachRolePermission(
        role.id,
        permissionId,
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository(),
          rolePermissionRepository: fakeRolePermissionRepository({
            findByRoleAndPermission: async () => null,
          }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("reports 501 not_implemented once authorization and existence are confirmed, and records why", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      detachRolePermission(
        role.id,
        permissionId,
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository(),
          rolePermissionRepository: fakeRolePermissionRepository(),
          auditSink,
        },
      ),
    ).rejects.toMatchObject({ code: "not_implemented", status: 501 });

    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "role.permission.detach",
        outcome: "denied",
        reason: "unsupported_by_schema",
      }),
    ]);
  });
});
