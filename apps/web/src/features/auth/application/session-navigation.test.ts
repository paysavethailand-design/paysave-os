import { describe, expect, it } from "vitest";
import type { AuthContext } from "@paysave/security";
import { getAuthenticatedLandingRoute, resolveSessionRedirect } from "./session-navigation";

const agentContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "42",
  roles: ["agent"],
  permissions: ["assignments.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

const adminContext: AuthContext = {
  ...agentContext,
  roles: ["admin"],
  permissions: [],
};

describe("resolveSessionRedirect", () => {
  it("redirects unauthenticated protected requests to sign in", () => {
    expect(resolveSessionRedirect("/", null)).toBe("/sign-in");
    expect(resolveSessionRedirect("/dashboard/admin", null)).toBe("/sign-in");
  });

  it("redirects only the legacy login alias while leaving canonical sign-in renderable", () => {
    expect(resolveSessionRedirect("/login", null)).toBe("/sign-in");
    expect(resolveSessionRedirect("/sign-in", null)).toBeNull();
  });

  it("redirects authenticated users away from both auth entry routes", () => {
    expect(resolveSessionRedirect("/sign-in", adminContext)).toBe("/dashboard/admin");
    expect(resolveSessionRedirect("/login", adminContext)).toBe("/dashboard/admin");
  });

  it("keeps operational public routes available to authenticated users", () => {
    expect(resolveSessionRedirect("/readyz", adminContext)).toBeNull();
    expect(resolveSessionRedirect("/version", adminContext)).toBeNull();
  });

  it("redirects authenticated users without route permission", () => {
    expect(resolveSessionRedirect("/admin/users", agentContext)).toBe("/unauthorized");
  });

  it("allows authenticated users with route permission", () => {
    expect(resolveSessionRedirect("/agent/tasks", agentContext)).toBeNull();
  });

  it("keeps a refreshed admin session on the admin dashboard", () => {
    expect(resolveSessionRedirect("/dashboard/admin", adminContext)).toBeNull();
  });

  it("has no redirect cycle among root, login, sign-in, and admin dashboard", () => {
    expect(resolveSessionRedirect("/", null)).toBe("/sign-in");
    expect(resolveSessionRedirect("/sign-in", null)).toBeNull();
    expect(resolveSessionRedirect("/login", null)).toBe("/sign-in");
    expect(resolveSessionRedirect("/", adminContext)).toBeNull();
    expect(resolveSessionRedirect("/login", adminContext)).toBe("/dashboard/admin");
    expect(resolveSessionRedirect("/sign-in", adminContext)).toBe("/dashboard/admin");
    expect(resolveSessionRedirect("/dashboard/admin", adminContext)).toBeNull();
  });
});

describe("getAuthenticatedLandingRoute", () => {
  it.each([
    [["super_admin"], "/dashboard/admin"],
    [["admin"], "/dashboard/admin"],
    [["partner"], "/dashboard/partner"],
    [["supervisor"], "/dashboard/supervisor"],
    [["agent"], "/dashboard/personal"],
  ] as const)("maps supported roles %j to the canonical dashboard", (roles, expected) => {
    expect(getAuthenticatedLandingRoute(roles)).toBe(expected);
  });

  it("fails closed when an authenticated context has no supported role", () => {
    expect(getAuthenticatedLandingRoute([])).toBe("/unauthorized");
  });
});
