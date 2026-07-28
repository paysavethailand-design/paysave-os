import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-error";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["roles.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const detachRolePermissionUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/roles/server", () => ({
  detachRolePermissionUseCase: (roleId: string, permissionId: string, context: unknown) =>
    detachRolePermissionUseCase(roleId, permissionId, context),
  ROLES_PERMISSIONS: { READ: "roles.read", MANAGE: "roles.manage" },
}));

const { DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  detachRolePermissionUseCase.mockReset();
});

describe("DELETE /api/v1/roles/[roleId]/permissions/[permissionId]", () => {
  it("requires roles.manage and returns 501 not_implemented", async () => {
    detachRolePermissionUseCase.mockRejectedValue(
      new ApiError(
        "not_implemented",
        "Revoking a role permission grant requires a schema amendment",
      ),
    );

    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1/permissions/2", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ roleId: "1", permissionId: "2" }) },
    );

    expect(requireApiPermission).toHaveBeenCalledWith("roles.manage");
    expect(detachRolePermissionUseCase).toHaveBeenCalledWith(
      "1",
      "2",
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(501);
  });
});
