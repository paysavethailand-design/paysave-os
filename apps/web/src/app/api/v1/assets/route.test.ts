import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["assets.read", "assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const listAssetsUseCase = vi.fn();
const createAssetUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/assets/server", () => ({
  listAssetsUseCase: (page: unknown, partnerId: unknown, who: unknown) =>
    listAssetsUseCase(page, partnerId, who),
  createAssetUseCase: (body: unknown, context: unknown) => createAssetUseCase(body, context),
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listAssetsUseCase.mockReset();
  createAssetUseCase.mockReset();
});

describe("GET /api/v1/assets", () => {
  it("requires assets.read", async () => {
    listAssetsUseCase.mockResolvedValue({ items: [], nextCursor: null });
    await GET(new NextRequest("https://api.paysave.internal/api/v1/assets"));
    expect(requireApiPermission).toHaveBeenCalledWith("assets.read");
  });
});

describe("POST /api/v1/assets", () => {
  it("requires assets.manage", async () => {
    createAssetUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/assets", {
        method: "POST",
        body: JSON.stringify({
          assetTypeId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
          businessObjectId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
          displayRef: "ABC-1234",
          currentStatusCode: "active",
        }),
      }),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("assets.manage");
    expect(response.status).toBe(201);
  });
});
