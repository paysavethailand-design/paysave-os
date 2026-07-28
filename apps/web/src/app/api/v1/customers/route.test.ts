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
const listCustomersUseCase = vi.fn();
const createCustomerUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/customers/server", () => ({
  listCustomersUseCase: (page: unknown, partnerId: unknown, who: unknown) =>
    listCustomersUseCase(page, partnerId, who),
  createCustomerUseCase: (body: unknown, context: unknown) => createCustomerUseCase(body, context),
  CUSTOMERS_PERMISSIONS: { READ: "customers.read", MANAGE: "customers.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listCustomersUseCase.mockReset();
  createCustomerUseCase.mockReset();
});

describe("GET /api/v1/customers", () => {
  it("requires customers.read", async () => {
    listCustomersUseCase.mockResolvedValue({ items: [], nextCursor: null });
    await GET(new NextRequest("https://api.paysave.internal/api/v1/customers"));
    expect(requireApiPermission).toHaveBeenCalledWith("customers.read");
  });
});

describe("POST /api/v1/customers", () => {
  it("requires customers.manage", async () => {
    createCustomerUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/customers", {
        method: "POST",
        body: JSON.stringify({ customerType: "individual", displayName: "Somchai" }),
      }),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("customers.manage");
    expect(response.status).toBe(201);
  });
});
