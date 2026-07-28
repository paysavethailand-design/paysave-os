import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-error";

const context: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["agent"],
  permissions: ["assignments.read"],
  tenantScope: "active",
  sessionVersion: 2,
};

const requireApiAuth = vi.fn().mockResolvedValue(context);
const signOutCurrentSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/features/auth/server", () => ({
  requireApiAuth: () => requireApiAuth(),
  signOutCurrentSession: () => signOutCurrentSession(),
  toSessionView: (input: AuthContext) => ({
    userId: input.userId,
    activePartnerId: input.activePartnerId,
    roles: input.roles,
    permissions: input.permissions,
    tenantScope: input.tenantScope,
    sessionVersion: input.sessionVersion,
  }),
}));

const { GET, DELETE } = await import("./route");

function request(method: string): NextRequest {
  return new NextRequest("https://api.paysave.internal/api/v1/sessions/me", { method });
}

describe("GET /api/v1/sessions/me", () => {
  it("returns the caller's session view", async () => {
    const response = await GET(request("GET"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { data: { userId: string } };
    expect(body.data.userId).toBe(context.userId);
  });

  it("maps unauthenticated callers to 401", async () => {
    requireApiAuth.mockRejectedValueOnce(
      new ApiError("unauthenticated", "Authentication is required"),
    );
    const response = await GET(request("GET"));
    expect(response.status).toBe(401);
  });
});

describe("DELETE /api/v1/sessions/me", () => {
  it("signs out the current session", async () => {
    const response = await DELETE(request("DELETE"));
    expect(response.status).toBe(200);
    expect(signOutCurrentSession).toHaveBeenCalledTimes(1);
    const body = (await response.json()) as { data: { signedOut: boolean } };
    expect(body.data.signedOut).toBe(true);
  });
});
