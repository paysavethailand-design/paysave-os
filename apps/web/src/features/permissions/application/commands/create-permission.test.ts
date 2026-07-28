import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/shared/lib/api-error";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";
import { createPermission } from "./create-permission";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["permissions.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

function fakeRepository(overrides: Partial<PermissionRepository> = {}): PermissionRepository {
  return {
    list: async () => [],
    findById: async () => null,
    findByCode: async () => null,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      code: input.code,
      resource: input.resource,
      action: input.action,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    }),
    update: async () => null,
    ...overrides,
  };
}

describe("createPermission", () => {
  it("rejects malformed input before touching the repository", async () => {
    const repository = fakeRepository();
    const auditSink = new RecordingAuditSink();

    await expect(
      createPermission(
        { code: "not valid", resource: "users", action: "read" },
        { actor, correlationId: "c1" },
        {
          repository,
          auditSink,
        },
      ),
    ).rejects.toThrow();
    expect(auditSink.all()).toHaveLength(0);
  });

  it("creates a permission and records a success audit event", async () => {
    const repository = fakeRepository();
    const auditSink = new RecordingAuditSink();

    const created: Permission = await createPermission(
      { code: "users.read", resource: "users", action: "read" },
      { actor, correlationId: "c1" },
      { repository, auditSink },
    );

    expect(created.code).toBe("users.read");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "permission.create",
        outcome: "success",
        resourceId: created.id,
      }),
    ]);
  });

  it("rejects a duplicate code with 409 and records a denied audit event", async () => {
    const existing: Permission = {
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
      code: "users.read",
      resource: "users",
      action: "read",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    const repository = fakeRepository({ findByCode: async () => existing });
    const auditSink = new RecordingAuditSink();

    await expect(
      createPermission(
        { code: "users.read", resource: "users", action: "read" },
        { actor, correlationId: "c1" },
        { repository, auditSink },
      ),
    ).rejects.toMatchObject({ code: "conflict", status: 409 } satisfies Partial<ApiError>);

    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "permission.create",
        outcome: "denied",
        reason: "duplicate_code",
      }),
    ]);
  });
});
