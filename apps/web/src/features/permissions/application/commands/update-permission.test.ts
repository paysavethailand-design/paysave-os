import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";
import { updatePermission } from "./update-permission";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["permissions.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

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
    update: async (id, input) => ({
      id,
      code: existing.code,
      resource: input.resource ?? existing.resource,
      action: input.action ?? existing.action,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    }),
    ...overrides,
  };
}

describe("updatePermission", () => {
  it("rejects an empty patch", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      updatePermission(
        existing.id,
        {},
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository(),
          auditSink,
        },
      ),
    ).rejects.toThrow();
  });

  it("updates the resource/action and records success", async () => {
    const auditSink = new RecordingAuditSink();
    const updated = await updatePermission(
      existing.id,
      { action: "manage" },
      { actor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink },
    );

    expect(updated.action).toBe("manage");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({ action: "permission.update", outcome: "success" }),
    ]);
  });

  it("returns 404 and records denied when the permission does not exist", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      updatePermission(
        "missing-id",
        { action: "manage" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ update: async () => null }),
          auditSink,
        },
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });

    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "permission.update",
        outcome: "denied",
        reason: "not_found",
      }),
    ]);
  });
});
