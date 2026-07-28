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
const listPermissionsUseCase = vi.fn();
const createPermissionUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/permissions/server", () => ({
  listPermissionsUseCase: (params: unknown) => listPermissionsUseCase(params),
  createPermissionUseCase: (body: unknown, context: unknown) =>
    createPermissionUseCase(body, context),
  PERMISSIONS_PERMISSIONS: { READ: "permissions.read", MANAGE: "permissions.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listPermissionsUseCase.mockReset();
  createPermissionUseCase.mockReset();
});

describe("GET /api/v1/permissions", () => {
  it("requires permissions.read and returns a bounded page", async () => {
    listPermissionsUseCase.mockResolvedValue({ items: [{ id: "1" }], nextCursor: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/permissions?limit=1"),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("permissions.read");
    expect(listPermissionsUseCase).toHaveBeenCalledWith({ limit: 1, cursor: null });
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: unknown[];
      meta: { nextCursor: string | null };
    };
    expect(body.data).toEqual([{ id: "1" }]);
    expect(body.meta.nextCursor).toBe("1");
  });

  it("propagates a 403 when the permission check fails", async () => {
    requireApiPermission.mockRejectedValueOnce(new ApiError("forbidden", "nope"));
    const response = await GET(new NextRequest("https://api.paysave.internal/api/v1/permissions"));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/permissions", () => {
  it("requires permissions.manage and delegates to the use case", async () => {
    createPermissionUseCase.mockResolvedValue({ id: "1", code: "users.read" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/permissions", {
        method: "POST",
        body: JSON.stringify({ code: "users.read", resource: "users", action: "read" }),
      }),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("permissions.manage");
    expect(createPermissionUseCase).toHaveBeenCalledWith(
      { code: "users.read", resource: "users", action: "read" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(201);
  });

  it("maps malformed JSON to 422 without invoking the use case", async () => {
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/permissions", {
        method: "POST",
        body: "{not-json",
      }),
    );
    expect(response.status).toBe(422);
    expect(createPermissionUseCase).not.toHaveBeenCalled();
  });
});
