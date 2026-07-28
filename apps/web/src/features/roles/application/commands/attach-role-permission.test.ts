import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RolePermission } from "../../domain/entities/role-permission";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";
import { attachRolePermission } from "./attach-role-permission";

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
    findByRoleAndPermission: async () => null,
    create: async (input): Promise<RolePermission> => ({
      id: "9a9a9a9a-2222-4d3d-9a1a-1111aaaa9999",
      partnerId: input.partnerId,
      roleId: input.roleId,
      permissionId: input.permissionId,
      effect: input.effect,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    }),
    ...overrides,
  };
}

describe("attachRolePermission", () => {
  it("grants the permission using the role's own partner_id", async () => {
    const created = await attachRolePermission(
      role.id,
      { permissionId },
      { actor, correlationId: "c1" },
      {
        roleRepository: fakeRoleRepository(),
        rolePermissionRepository: fakeRolePermissionRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(created.partnerId).toBe(activePartnerId);
    expect(created.effect).toBe("allow");
  });

  it("404s when the role does not exist", async () => {
    await expect(
      attachRolePermission(
        "missing",
        { permissionId },
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository({ findById: async () => null }),
          rolePermissionRepository: fakeRolePermissionRepository(),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("409s when the permission is already granted", async () => {
    const existing: RolePermission = {
      id: "9a9a9a9a-2222-4d3d-9a1a-1111aaaa9999",
      partnerId: activePartnerId,
      roleId: role.id,
      permissionId,
      effect: "allow",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    await expect(
      attachRolePermission(
        role.id,
        { permissionId },
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository(),
          rolePermissionRepository: fakeRolePermissionRepository({
            findByRoleAndPermission: async () => existing,
          }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("denies a tenant actor whose active partner does not match the role's partner", async () => {
    const otherPartnerRole: Role = { ...role, partnerId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567" };
    await expect(
      attachRolePermission(
        role.id,
        { permissionId },
        { actor, correlationId: "c1" },
        {
          roleRepository: fakeRoleRepository({ findById: async () => otherPartnerRole }),
          rolePermissionRepository: fakeRolePermissionRepository(),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
