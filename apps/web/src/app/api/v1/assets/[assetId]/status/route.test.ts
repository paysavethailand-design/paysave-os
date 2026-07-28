import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const changeAssetStatusUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/assets/server", () => ({
  changeAssetStatusUseCase: (id: string, body: unknown, context: unknown) =>
    changeAssetStatusUseCase(id, body, context),
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
}));

const { POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  changeAssetStatusUseCase.mockReset();
});

describe("POST /api/v1/assets/[assetId]/status", () => {
  it("requires assets.manage and forwards the transition", async () => {
    changeAssetStatusUseCase.mockResolvedValue({ id: "1", currentStatusCode: "repossessed" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/assets/1/status", {
        method: "POST",
        body: JSON.stringify({ toStatusCode: "repossessed", reasonCode: "recovery_completed" }),
      }),
      { params: Promise.resolve({ assetId: "1" }) },
    );

    expect(requireApiPermission).toHaveBeenCalledWith("assets.manage");
    expect(changeAssetStatusUseCase).toHaveBeenCalledWith(
      "1",
      { toStatusCode: "repossessed", reasonCode: "recovery_completed" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
  });
});
