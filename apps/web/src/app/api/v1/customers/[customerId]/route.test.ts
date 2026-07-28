import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["customers.read", "customers.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const getCustomerUseCase = vi.fn();
const updateCustomerUseCase = vi.fn();
const deleteCustomerUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/customers/server", () => ({
  getCustomerUseCase: (id: string) => getCustomerUseCase(id),
  updateCustomerUseCase: (id: string, body: unknown, context: unknown) =>
    updateCustomerUseCase(id, body, context),
  deleteCustomerUseCase: (id: string, body: unknown, context: unknown) =>
    deleteCustomerUseCase(id, body, context),
  CUSTOMERS_PERMISSIONS: { READ: "customers.read", MANAGE: "customers.manage" },
}));

const { GET, PATCH, DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getCustomerUseCase.mockReset();
  updateCustomerUseCase.mockReset();
  deleteCustomerUseCase.mockReset();
});

function paramsFor(customerId: string) {
  return { params: Promise.resolve({ customerId }) };
}

describe("GET /api/v1/customers/[customerId]", () => {
  it("returns the customer", async () => {
    getCustomerUseCase.mockResolvedValue({ id: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/customers/1"),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/v1/customers/[customerId]", () => {
  it("requires customers.manage and forwards the patch", async () => {
    updateCustomerUseCase.mockResolvedValue({ id: "1", status: "active" });
    const response = await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/customers/1", {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("customers.manage");
    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/v1/customers/[customerId]", () => {
  it("requires a reason and customers.manage", async () => {
    deleteCustomerUseCase.mockResolvedValue({ id: "1", deletedAt: "2026-07-22T00:00:00.000Z" });
    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/customers/1", {
        method: "DELETE",
        body: JSON.stringify({ reason: "duplicate" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("customers.manage");
    expect(response.status).toBe(200);
  });
});
