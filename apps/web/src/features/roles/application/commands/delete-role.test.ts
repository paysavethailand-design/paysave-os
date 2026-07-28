import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";
import { deleteRole } from "./delete-role";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["roles.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const existing: Role = {
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

const fixedClock = { now: () => new Date("2026-07-22T00:00:00.000Z") };

function fakeRepository(overrides: Partial<RoleRepository> = {}): RoleRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByCode: async () => null,
    create: async () => existing,
    update: async () => existing,
    softDelete: async (id, fields) => ({ ...existing, id, deletedAt: fields.deletedAt }),
    ...overrides,
  };
}

describe("deleteRole", () => {
  it("rejects a missing reason", async () => {
    await expect(
      deleteRole(
        existing.id,
        {},
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository(),
          auditSink: new RecordingAuditSink(),
          clock: fixedClock,
        },
      ),
    ).rejects.toThrow();
  });

  it("soft-deletes via UPDATE, never a SQL DELETE, and records the reason", async () => {
    const auditSink = new RecordingAuditSink();
    const deleted = await deleteRole(
      existing.id,
      { reason: "duplicate role" },
      { actor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink, clock: fixedClock },
    );

    expect(deleted.deletedAt).toBe("2026-07-22T00:00:00.000Z");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "role.delete",
        outcome: "success",
        reason: "duplicate role",
      }),
    ]);
  });

  it("returns 404 when the role does not exist", async () => {
    await expect(
      deleteRole(
        "missing",
        { reason: "x" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => null }),
          auditSink: new RecordingAuditSink(),
          clock: fixedClock,
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
