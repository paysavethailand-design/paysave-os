import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";
import { updateCustomer } from "./update-customer";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["customers.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const existing: Customer = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  partnerId: activePartnerId,
  customerType: "individual",
  displayName: "Somchai Prasert",
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

function fakeRepository(overrides: Partial<CustomerRepository> = {}): CustomerRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    create: async () => existing,
    update: async (id, input) => ({
      ...existing,
      id,
      displayName: input.displayName ?? existing.displayName,
      status: input.status ?? existing.status,
    }),
    softDelete: async () => null,
    ...overrides,
  };
}

describe("updateCustomer", () => {
  it("updates the display name", async () => {
    const updated = await updateCustomer(
      existing.id,
      { displayName: "Somchai Updated" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(updated.displayName).toBe("Somchai Updated");
  });

  it("404s when not found", async () => {
    await expect(
      updateCustomer(
        "missing",
        { status: "active" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => null }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("denies a tenant actor acting outside their active partner", async () => {
    const outside = { ...existing, partnerId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567" };
    await expect(
      updateCustomer(
        existing.id,
        { status: "active" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => outside }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
