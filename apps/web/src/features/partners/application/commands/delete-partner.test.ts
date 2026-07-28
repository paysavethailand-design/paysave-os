import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";
import { deletePartner } from "./delete-partner";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: partnerId,
  roles: ["admin"],
  permissions: ["partners.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const existing: Partner = {
  id: partnerId,
  code: "acme-recovery",
  name: "ACME Recovery",
  status: "active",
  timezone: "Asia/Bangkok",
  defaultCurrency: "THB",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

const fixedClock = { now: () => new Date("2026-07-22T00:00:00.000Z") };

function fakeRepository(overrides: Partial<PartnerRepository> = {}): PartnerRepository {
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

describe("deletePartner", () => {
  it("requires a reason", async () => {
    await expect(
      deletePartner(
        partnerId,
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

  it("soft-deletes via UPDATE and records the reason", async () => {
    const auditSink = new RecordingAuditSink();
    const deleted = await deletePartner(
      partnerId,
      { reason: "merged with another tenant" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink,
        clock: fixedClock,
      },
    );
    expect(deleted.deletedAt).toBe("2026-07-22T00:00:00.000Z");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "partner.delete",
        outcome: "success",
        reason: "merged with another tenant",
      }),
    ]);
  });
});
