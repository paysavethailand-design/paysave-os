import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["roles.read", "roles.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const listRolePermissionsUseCase = vi.fn();
const attachRolePermissionUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/roles/server", () => ({
  listRolePermissionsUseCase: (roleId: string, who: unknown) =>
    listRolePermissionsUseCase(roleId, who),
  attachRolePermissionUseCase: (roleId: string, body: unknown, context: unknown) =>
    attachRolePermissionUseCase(roleId, body, context),
  ROLES_PERMISSIONS: { READ: "roles.read", MANAGE: "roles.manage" },
}));

const { GET, POST } = await import("./route");

function paramsFor(roleId: string) {
  return { params: Promise.resolve({ roleId }) };
}

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listRolePermissionsUseCase.mockReset();
  attachRolePermissionUseCase.mockReset();
});

describe("GET /api/v1/roles/[roleId]/permissions", () => {
  it("requires roles.read and returns the grants", async () => {
    listRolePermissionsUseCase.mockResolvedValue([{ id: "1" }]);
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1/permissions"),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("roles.read");
    expect(response.status).toBe(200);
  });
});

describe("POST /api/v1/roles/[roleId]/permissions", () => {
  it("requires roles.manage and creates the grant", async () => {
    attachRolePermissionUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1/permissions", {
        method: "POST",
        body: JSON.stringify({ permissionId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("roles.manage");
    expect(response.status).toBe(201);
  });
});
