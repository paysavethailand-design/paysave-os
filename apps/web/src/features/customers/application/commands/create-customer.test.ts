import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { CustomerRepository } from "../ports/customer-repository";
import { createCustomer } from "./create-customer";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const tenantActor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["customers.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const globalActor: AuthContext = { ...tenantActor, activePartnerId: null, tenantScope: "all" };

function fakeRepository(overrides: Partial<CustomerRepository> = {}): CustomerRepository {
  return {
    list: async () => [],
    findById: async () => null,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      partnerId: input.partnerId,
      customerType: input.customerType,
      displayName: input.displayName,
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

describe("createCustomer", () => {
  it("defaults to the caller's active partner", async () => {
    const created = await createCustomer(
      { customerType: "individual", displayName: "Somchai Prasert" },
      { actor: tenantActor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink: new RecordingAuditSink() },
    );
    expect(created.partnerId).toBe(activePartnerId);
  });

  it("requires an explicit partnerId for a global-admin caller", async () => {
    await expect(
      createCustomer(
        { customerType: "individual", displayName: "Somchai Prasert" },
        { actor: globalActor, correlationId: "c1" },
        { repository: fakeRepository(), auditSink: new RecordingAuditSink() },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("allows duplicate display names (no uniqueness constraint on normalized_name_hash)", async () => {
    const auditSink = new RecordingAuditSink();
    const created = await createCustomer(
      { customerType: "individual", displayName: "Somchai Prasert" },
      { actor: tenantActor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink },
    );
    expect(created.displayName).toBe("Somchai Prasert");
    expect(auditSink.all()).toEqual([
      expect.objectContaining({ action: "customer.create", outcome: "success" }),
    ]);
  });
});
