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
const listRolesUseCase = vi.fn();
const createRoleUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/roles/server", () => ({
  listRolesUseCase: (page: unknown, partnerId: unknown, who: unknown) =>
    listRolesUseCase(page, partnerId, who),
  createRoleUseCase: (body: unknown, context: unknown) => createRoleUseCase(body, context),
  ROLES_PERMISSIONS: { READ: "roles.read", MANAGE: "roles.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listRolesUseCase.mockReset();
  createRoleUseCase.mockReset();
});

describe("GET /api/v1/roles", () => {
  it("passes the optional partnerId query param through to the use case", async () => {
    listRolesUseCase.mockResolvedValue({ items: [], nextCursor: null });
    await GET(new NextRequest("https://api.paysave.internal/api/v1/roles?partnerId=abc"));
    expect(listRolesUseCase).toHaveBeenCalledWith({ limit: 20, cursor: null }, "abc", actor);
  });
});

describe("POST /api/v1/roles", () => {
  it("requires roles.manage and delegates to the use case", async () => {
    createRoleUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/roles", {
        method: "POST",
        body: JSON.stringify({ code: "supervisor-l2", name: "Supervisor L2" }),
      }),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("roles.manage");
    expect(response.status).toBe(201);
  });
});
