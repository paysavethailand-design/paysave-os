import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";
import { createRole } from "./create-role";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const tenantActor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["roles.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const globalActor: AuthContext = { ...tenantActor, activePartnerId: null, tenantScope: "all" };

function fakeRepository(overrides: Partial<RoleRepository> = {}): RoleRepository {
  return {
    list: async () => [],
    findById: async () => null,
    findByCode: async () => null,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      partnerId: input.partnerId,
      templateId: input.templateId ?? null,
      code: input.code,
      name: input.name,
      status: input.status,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
      deletedAt: null,
    }),
    update: async () => null,
    softDelete: async () => null,
    ...overrides,
  };
}

describe("createRole", () => {
  it("defaults to the caller's active partner", async () => {
    const created = await createRole(
      { code: "supervisor-l2", name: "Supervisor L2" },
      { actor: tenantActor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink: new RecordingAuditSink() },
    );
    expect(created.partnerId).toBe(activePartnerId);
  });

  it("requires an explicit partnerId for a global-admin caller", async () => {
    await expect(
      createRole(
        { code: "supervisor-l2", name: "Supervisor L2" },
        { actor: globalActor, correlationId: "c1" },
        { repository: fakeRepository(), auditSink: new RecordingAuditSink() },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("rejects a duplicate code within the same partner", async () => {
    const existing: Role = {
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
      partnerId: activePartnerId,
      templateId: null,
      code: "supervisor-l2",
      name: "Existing",
      status: "active",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      deletedAt: null,
    };
    const auditSink = new RecordingAuditSink();
    await expect(
      createRole(
        { code: "supervisor-l2", name: "Supervisor L2" },
        { actor: tenantActor, correlationId: "c1" },
        { repository: fakeRepository({ findByCode: async () => existing }), auditSink },
      ),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "role.create",
        outcome: "denied",
        reason: "duplicate_code",
      }),
    ]);
  });
});
