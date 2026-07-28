import { describe, expect, it } from "vitest";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";
import { getCustomer } from "./get-customer";

const existing: Customer = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  partnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
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
    update: async () => existing,
    softDelete: async () => existing,
    ...overrides,
  };
}

describe("getCustomer", () => {
  it("returns the customer when found", async () => {
    await expect(getCustomer(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws 404 when not found", async () => {
    await expect(
      getCustomer("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
