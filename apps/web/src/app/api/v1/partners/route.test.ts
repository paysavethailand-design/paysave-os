import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["partners.read", "partners.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const listPartnersUseCase = vi.fn();
const createPartnerUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/partners/server", () => ({
  listPartnersUseCase: (params: unknown) => listPartnersUseCase(params),
  createPartnerUseCase: (body: unknown, context: unknown) => createPartnerUseCase(body, context),
  PARTNERS_PERMISSIONS: { READ: "partners.read", MANAGE: "partners.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listPartnersUseCase.mockReset();
  createPartnerUseCase.mockReset();
});

describe("GET /api/v1/partners", () => {
  it("requires partners.read", async () => {
    listPartnersUseCase.mockResolvedValue({ items: [], nextCursor: null });
    await GET(new NextRequest("https://api.paysave.internal/api/v1/partners"));
    expect(requireApiPermission).toHaveBeenCalledWith("partners.read");
  });
});

describe("POST /api/v1/partners", () => {
  it("requires partners.manage and delegates to the use case", async () => {
    createPartnerUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/partners", {
        method: "POST",
        body: JSON.stringify({
          code: "acme",
          name: "ACME",
          timezone: "Asia/Bangkok",
          defaultCurrency: "THB",
        }),
      }),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("partners.manage");
    expect(response.status).toBe(201);
  });
});
