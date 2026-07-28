import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";
import { createUser } from "./create-user";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["users.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const fixedClock = { now: () => new Date("2026-07-22T00:00:00.000Z") };

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    list: async () => [],
    findById: async () => null,
    findByAuthSubject: async () => null,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      authSubject: input.authSubject,
      displayName: input.displayName,
      status: input.status,
      lastSeenAt: input.lastSeenAt,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    }),
    update: async () => null,
    ...overrides,
  };
}

describe("createUser", () => {
  it("stamps lastSeenAt from the injected clock", async () => {
    const repository = fakeRepository();
    const auditSink = new RecordingAuditSink();

    const created: User = await createUser(
      { authSubject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567", displayName: "Somchai Prasert" },
      { actor, correlationId: "c1" },
      { repository, auditSink, clock: fixedClock },
    );

    expect(created.lastSeenAt).toBe("2026-07-22T00:00:00.000Z");
    expect(created.status).toBe("active");
  });

  it("rejects a duplicate auth subject with 409 and records a denied audit event", async () => {
    const existing: User = {
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
      authSubject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
      displayName: "Existing",
      status: "active",
      lastSeenAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
    };
    const repository = fakeRepository({ findByAuthSubject: async () => existing });
    const auditSink = new RecordingAuditSink();

    await expect(
      createUser(
        { authSubject: existing.authSubject, displayName: "Somchai Prasert" },
        { actor, correlationId: "c1" },
        { repository, auditSink, clock: fixedClock },
      ),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });

    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "user.create",
        outcome: "denied",
        reason: "duplicate_auth_subject",
      }),
    ]);
  });
});
