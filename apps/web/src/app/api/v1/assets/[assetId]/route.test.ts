import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-error";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["assets.read", "assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const getAssetUseCase = vi.fn();
const updateAssetUseCase = vi.fn();
const retireAssetUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/assets/server", () => ({
  getAssetUseCase: (id: string) => getAssetUseCase(id),
  updateAssetUseCase: (id: string, body: unknown, context: unknown) =>
    updateAssetUseCase(id, body, context),
  retireAssetUseCase: (id: string, body: unknown, context: unknown) =>
    retireAssetUseCase(id, body, context),
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
}));

const { GET, PATCH, DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getAssetUseCase.mockReset();
  updateAssetUseCase.mockReset();
  retireAssetUseCase.mockReset();
});

function paramsFor(assetId: string) {
  return { params: Promise.resolve({ assetId }) };
}

describe("GET /api/v1/assets/[assetId]", () => {
  it("returns the asset", async () => {
    getAssetUseCase.mockResolvedValue({ id: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/assets/1"),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/v1/assets/[assetId]", () => {
  it("requires assets.manage", async () => {
    updateAssetUseCase.mockResolvedValue({ asset: { id: "1" }, rowsAffected: 1 });
    await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/assets/1", {
        method: "PATCH",
        body: JSON.stringify({ displayRef: "New", expectedVersionNo: 1 }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("assets.manage");
  });

  it("returns 409 for an optimistic version conflict instead of collapsing it to 500", async () => {
    updateAssetUseCase.mockRejectedValue(new ApiError("conflict", "Asset update failed"));
    const response = await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/assets/1", {
        method: "PATCH",
        body: JSON.stringify({ displayRef: "Updated", expectedVersionNo: 1 }),
      }),
      paramsFor("1"),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "conflict" } });
  });
});

describe("DELETE /api/v1/assets/[assetId]", () => {
  it("retires the asset via the retire use case", async () => {
    retireAssetUseCase.mockResolvedValue({ id: "1", currentStatusCode: "retired" });
    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/assets/1", {
        method: "DELETE",
        body: JSON.stringify({ reasonCode: "written_off" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("assets.manage");
    expect(retireAssetUseCase).toHaveBeenCalledWith(
      "1",
      { reasonCode: "written_off" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
  });
});
