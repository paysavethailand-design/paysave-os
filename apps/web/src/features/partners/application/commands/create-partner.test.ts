import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";
import { createPartner } from "./create-partner";

const globalActor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["partners.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const tenantActor: AuthContext = {
  ...globalActor,
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  tenantScope: "active",
};

const validInput = {
  code: "acme-recovery",
  name: "ACME Recovery",
  timezone: "Asia/Bangkok",
  defaultCurrency: "thb",
};

function fakeRepository(overrides: Partial<PartnerRepository> = {}): PartnerRepository {
  return {
    list: async () => [],
    findById: async () => null,
    findByCode: async () => null,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      code: input.code,
      name: input.name,
      status: input.status,
      timezone: input.timezone,
      defaultCurrency: input.defaultCurrency,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
      deletedAt: null,
    }),
    update: async () => null,
    softDelete: async () => null,
    ...overrides,
  };
}

describe("createPartner", () => {
  it("uppercases the currency code and defaults status to active", async () => {
    const created = await createPartner(
      validInput,
      { actor: globalActor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(created.defaultCurrency).toBe("THB");
    expect(created.status).toBe("active");
  });

  it("rejects a non-global-admin caller before touching the repository", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      createPartner(
        validInput,
        { actor: tenantActor, correlationId: "c1" },
        {
          repository: fakeRepository(),
          auditSink,
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "partner.create",
        outcome: "denied",
        reason: "not_global_admin",
      }),
    ]);
  });

  it("rejects a duplicate partner code", async () => {
    const existing: Partner = {
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
      code: "acme-recovery",
      name: "Existing",
      status: "active",
      timezone: "Asia/Bangkok",
      defaultCurrency: "THB",
      createdAt: "2026-07-01T00:00:00.000Z",
      updatedAt: "2026-07-01T00:00:00.000Z",
      deletedAt: null,
    };
    await expect(
      createPartner(
        validInput,
        { actor: globalActor, correlationId: "c1" },
        {
          repository: fakeRepository({ findByCode: async () => existing }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "conflict" });
  });
});
