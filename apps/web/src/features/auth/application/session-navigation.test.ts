import { describe, expect, it } from "vitest";
import type { AuthContext } from "@paysave/security";
import { resolveSessionRedirect } from "./session-navigation";

const agentContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "42",
  roles: ["agent"],
  permissions: ["assignments.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

describe("resolveSessionRedirect", () => {
  it("redirects unauthenticated protected requests to sign in", () => {
    expect(resolveSessionRedirect("/dashboard", null)).toBe("/sign-in");
  });

  it("redirects an authenticated user away from sign in", () => {
    expect(resolveSessionRedirect("/sign-in", agentContext)).toBe("/");
  });

  it("redirects authenticated users without route permission", () => {
    expect(resolveSessionRedirect("/admin/users", agentContext)).toBe("/unauthorized");
  });

  it("allows authenticated users with route permission", () => {
    expect(resolveSessionRedirect("/agent/tasks", agentContext)).toBeNull();
  });
});
