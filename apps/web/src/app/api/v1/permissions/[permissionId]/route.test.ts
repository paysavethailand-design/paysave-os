import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-error";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["permissions.read", "permissions.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const getPermissionUseCase = vi.fn();
const updatePermissionUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/permissions/server", () => ({
  getPermissionUseCase: (id: string) => getPermissionUseCase(id),
  updatePermissionUseCase: (id: string, body: unknown, context: unknown) =>
    updatePermissionUseCase(id, body, context),
  PERMISSIONS_PERMISSIONS: { READ: "permissions.read", MANAGE: "permissions.manage" },
}));

const { GET, PATCH } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getPermissionUseCase.mockReset();
  updatePermissionUseCase.mockReset();
});

function paramsFor(permissionId: string) {
  return { params: Promise.resolve({ permissionId }) };
}

describe("GET /api/v1/permissions/[permissionId]", () => {
  it("returns the permission", async () => {
    getPermissionUseCase.mockResolvedValue({ id: "1", code: "users.read" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/permissions/1"),
      paramsFor("1"),
    );
    expect(getPermissionUseCase).toHaveBeenCalledWith("1");
    expect(response.status).toBe(200);
  });

  it("maps a not-found use case error to 404", async () => {
    getPermissionUseCase.mockRejectedValue(new ApiError("not_found", "Permission not found"));
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/permissions/missing"),
      paramsFor("missing"),
    );
    expect(response.status).toBe(404);
  });
});

describe("PATCH /api/v1/permissions/[permissionId]", () => {
  it("requires permissions.manage and forwards the patch", async () => {
    updatePermissionUseCase.mockResolvedValue({ id: "1", action: "manage" });
    const response = await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/permissions/1", {
        method: "PATCH",
        body: JSON.stringify({ action: "manage" }),
      }),
      paramsFor("1"),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("permissions.manage");
    expect(updatePermissionUseCase).toHaveBeenCalledWith(
      "1",
      { action: "manage" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
  });
});
