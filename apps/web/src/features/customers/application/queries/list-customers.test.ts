import type { AuthContext } from "@paysave/security";
import { describe, expect, it, vi } from "vitest";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";
import { listCustomers } from "./list-customers";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["customers.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

function customer(id: string): Customer {
  return {
    id,
    partnerId: activePartnerId,
    customerType: "individual",
    displayName: `Customer ${id}`,
    status: "active",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
  };
}

describe("listCustomers", () => {
  it("scopes the query to the caller's active partner", async () => {
    const list = vi.fn().mockResolvedValue([customer("1")]);
    const repository: CustomerRepository = {
      list,
      findById: async () => null,
      create: async () => customer("1"),
      update: async () => null,
      softDelete: async () => null,
    };

    await listCustomers({ limit: 20, cursor: null }, null, actor, repository);
    expect(list).toHaveBeenCalledWith({ partnerId: activePartnerId, limit: 20, cursor: null });
  });
});
