import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";
import { deleteCustomer } from "./delete-customer";

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

const fixedClock = { now: () => new Date("2026-07-22T00:00:00.000Z") };

function fakeRepository(overrides: Partial<CustomerRepository> = {}): CustomerRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    create: async () => existing,
    update: async () => existing,
    softDelete: async (id, fields) => ({ ...existing, id, deletedAt: fields.deletedAt }),
    ...overrides,
  };
}

describe("deleteCustomer", () => {
  it("requires a reason", async () => {
    await expect(
      deleteCustomer(
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

  it("soft-deletes via UPDATE, never a SQL DELETE", async () => {
    const deleted = await deleteCustomer(
      existing.id,
      { reason: "duplicate record" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
        clock: fixedClock,
      },
    );
    expect(deleted.deletedAt).toBe("2026-07-22T00:00:00.000Z");
  });
});
