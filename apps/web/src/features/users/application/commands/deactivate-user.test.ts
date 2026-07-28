import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";
import { deactivateUser } from "./deactivate-user";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["users.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const existing: User = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  authSubject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  displayName: "Somchai Prasert",
  status: "active",
  lastSeenAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByAuthSubject: async () => null,
    create: async () => existing,
    update: async (id, input) => ({ ...existing, id, status: input.status ?? existing.status }),
    ...overrides,
  };
}

describe("deactivateUser", () => {
  it("transitions status to suspended and records the audit reason", async () => {
    const auditSink = new RecordingAuditSink();
    const updated = await deactivateUser(
      existing.id,
      { reason: "offboarding" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink,
      },
    );

    expect(updated.status).toBe("suspended");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "user.deactivate",
        outcome: "success",
        reason: "offboarding",
      }),
    ]);
  });

  it("returns 404 when the user does not exist", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      deactivateUser(
        "missing",
        {},
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ update: async () => null }),
          auditSink,
        },
      ),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
