import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["partners.read", "partners.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const getPartnerUseCase = vi.fn();
const updatePartnerUseCase = vi.fn();
const deletePartnerUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/partners/server", () => ({
  getPartnerUseCase: (id: string) => getPartnerUseCase(id),
  updatePartnerUseCase: (id: string, body: unknown, context: unknown) =>
    updatePartnerUseCase(id, body, context),
  deletePartnerUseCase: (id: string, body: unknown, context: unknown) =>
    deletePartnerUseCase(id, body, context),
  PARTNERS_PERMISSIONS: { READ: "partners.read", MANAGE: "partners.manage" },
}));

const { GET, PATCH, DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getPartnerUseCase.mockReset();
  updatePartnerUseCase.mockReset();
  deletePartnerUseCase.mockReset();
});

function paramsFor(partnerId: string) {
  return { params: Promise.resolve({ partnerId }) };
}

describe("GET /api/v1/partners/[partnerId]", () => {
  it("returns the partner", async () => {
    getPartnerUseCase.mockResolvedValue({ id: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/partners/1"),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/v1/partners/[partnerId]", () => {
  it("requires partners.manage", async () => {
    updatePartnerUseCase.mockResolvedValue({ id: "1" });
    await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/partners/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "New" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("partners.manage");
  });
});

describe("DELETE /api/v1/partners/[partnerId]", () => {
  it("forwards the reason and requires partners.manage", async () => {
    deletePartnerUseCase.mockResolvedValue({ id: "1", deletedAt: "2026-07-22T00:00:00.000Z" });
    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/partners/1", {
        method: "DELETE",
        body: JSON.stringify({ reason: "merged" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("partners.manage");
    expect(deletePartnerUseCase).toHaveBeenCalledWith(
      "1",
      { reason: "merged" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
  });
});
