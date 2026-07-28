import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";
import { updateRole } from "./update-role";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const otherPartnerId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";

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

function fakeRepository(overrides: Partial<RoleRepository> = {}): RoleRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByCode: async () => null,
    create: async () => existing,
    update: async (id, input) => ({
      ...existing,
      id,
      name: input.name ?? existing.name,
      status: input.status ?? existing.status,
    }),
    softDelete: async () => null,
    ...overrides,
  };
}

describe("updateRole", () => {
  it("updates the role when it is in the caller's partner", async () => {
    const updated = await updateRole(
      existing.id,
      { name: "Supervisor L3" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(updated.name).toBe("Supervisor L3");
  });

  it("returns 404 when the role does not exist (or is invisible under RLS)", async () => {
    await expect(
      updateRole(
        "missing",
        { name: "x" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => null }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("denies a tenant actor acting outside their active partner", async () => {
    const outside = { ...existing, partnerId: otherPartnerId };
    await expect(
      updateRole(
        existing.id,
        { name: "x" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => outside }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
