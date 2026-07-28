import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";
import { updatePartner } from "./update-partner";

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

function fakeRepository(overrides: Partial<PartnerRepository> = {}): PartnerRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByCode: async () => null,
    create: async () => existing,
    update: async (id, input) => ({ ...existing, id, name: input.name ?? existing.name }),
    softDelete: async () => null,
    ...overrides,
  };
}

describe("updatePartner", () => {
  it("updates the caller's own partner", async () => {
    const updated = await updatePartner(
      partnerId,
      { name: "ACME Recovery Co." },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(updated.name).toBe("ACME Recovery Co.");
  });

  it("404s when the partner is not found", async () => {
    await expect(
      updatePartner(
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

  it("denies a tenant actor acting on a different partner", async () => {
    const other = { ...existing, id: "1a2b3c4d-5e6f-4789-90ab-cdef01234567" };
    await expect(
      updatePartner(
        other.id,
        { name: "x" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => other }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
