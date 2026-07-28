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
const getRoleUseCase = vi.fn();
const updateRoleUseCase = vi.fn();
const deleteRoleUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/roles/server", () => ({
  getRoleUseCase: (id: string) => getRoleUseCase(id),
  updateRoleUseCase: (id: string, body: unknown, context: unknown) =>
    updateRoleUseCase(id, body, context),
  deleteRoleUseCase: (id: string, body: unknown, context: unknown) =>
    deleteRoleUseCase(id, body, context),
  ROLES_PERMISSIONS: { READ: "roles.read", MANAGE: "roles.manage" },
}));

const { GET, PATCH, DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getRoleUseCase.mockReset();
  updateRoleUseCase.mockReset();
  deleteRoleUseCase.mockReset();
});

function paramsFor(roleId: string) {
  return { params: Promise.resolve({ roleId }) };
}

describe("DELETE /api/v1/roles/[roleId]", () => {
  it("requires roles.manage and forwards the delete reason", async () => {
    deleteRoleUseCase.mockResolvedValue({ id: "1", deletedAt: "2026-07-22T00:00:00.000Z" });
    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1", {
        method: "DELETE",
        body: JSON.stringify({ reason: "duplicate" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("roles.manage");
    expect(deleteRoleUseCase).toHaveBeenCalledWith(
      "1",
      { reason: "duplicate" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
  });
});

describe("GET /api/v1/roles/[roleId]", () => {
  it("returns the role", async () => {
    getRoleUseCase.mockResolvedValue({ id: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1"),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/v1/roles/[roleId]", () => {
  it("forwards the patch", async () => {
    updateRoleUseCase.mockResolvedValue({ id: "1", name: "New" });
    const response = await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/roles/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "New" }),
      }),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});
