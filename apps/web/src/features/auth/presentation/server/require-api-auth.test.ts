import type { AuthContext } from "@paysave/security";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError } from "@/shared/lib/api-error";

const getAuthContext = vi.fn<() => Promise<AuthContext | null>>();

vi.mock("../../infrastructure/supabase/get-auth-context", () => ({
  getAuthContext: () => getAuthContext(),
}));

const { requireApiAuth } = await import("./require-api-auth");

const context: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["agent"],
  permissions: ["assignments.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

beforeEach(() => {
  getAuthContext.mockReset();
});

describe("requireApiAuth", () => {
  it("returns the verified context when a session exists", async () => {
    getAuthContext.mockResolvedValue(context);
    await expect(requireApiAuth()).resolves.toEqual(context);
  });

  it("throws a 401 ApiError when there is no session", async () => {
    getAuthContext.mockResolvedValue(null);
    await expect(requireApiAuth()).rejects.toMatchObject({
      code: "unauthenticated",
      status: 401,
    } satisfies Partial<ApiError>);
  });
});
