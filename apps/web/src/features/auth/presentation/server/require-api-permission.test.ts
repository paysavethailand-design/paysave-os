import type { AuthContext } from "@paysave/security";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthContext = vi.fn<() => Promise<AuthContext | null>>();

vi.mock("../../infrastructure/supabase/get-auth-context", () => ({
  getAuthContext: () => getAuthContext(),
}));

const { requireApiPermission, requireApiPermissions } = await import("./require-api-permission");

const context: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["users.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

beforeEach(() => {
  getAuthContext.mockReset();
  getAuthContext.mockResolvedValue(context);
});

describe("requireApiPermission", () => {
  it("returns the context when the permission is present", async () => {
    await expect(requireApiPermission("users.read")).resolves.toEqual(context);
  });

  it("throws a 403 ApiError when the permission is missing", async () => {
    await expect(requireApiPermission("users.manage")).rejects.toMatchObject({
      code: "forbidden",
      status: 403,
    });
  });

  it("throws a 401 ApiError before checking permission when unauthenticated", async () => {
    getAuthContext.mockResolvedValue(null);
    await expect(requireApiPermission("users.read")).rejects.toMatchObject({
      code: "unauthenticated",
      status: 401,
    });
  });
});

describe("requireApiPermissions", () => {
  it("requires every listed permission", async () => {
    await expect(requireApiPermissions(["users.read"])).resolves.toEqual(context);
    await expect(requireApiPermissions(["users.read", "users.manage"])).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
