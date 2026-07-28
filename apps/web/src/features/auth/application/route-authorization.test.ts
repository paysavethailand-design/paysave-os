import { describe, expect, it } from "vitest";
import { canAccessDesignPreview, getRoutePolicy, isPublicRoute } from "./route-authorization";

describe("route authorization", () => {
  it("allows authentication callbacks and operational probes without a session", () => {
    expect(isPublicRoute("/auth/callback")).toBe(true);
    expect(isPublicRoute("/sign-in")).toBe(true);
    expect(isPublicRoute("/healthz")).toBe(true);
    expect(isPublicRoute("/readyz")).toBe(true);
    expect(isPublicRoute("/version")).toBe(true);
    expect(isPublicRoute("/metrics")).toBe(true);
  });

  it("requires user management permission for admin routes", () => {
    expect(getRoutePolicy("/admin/users")).toEqual({
      authenticationRequired: true,
      permissions: ["users.manage"],
    });
  });

  it("protects unknown application routes by default", () => {
    expect(getRoutePolicy("/dashboard")).toEqual({
      authenticationRequired: true,
      permissions: [],
    });
  });

  it("opens design previews only when the explicit environment gate is enabled", () => {
    expect(canAccessDesignPreview("/preview/layout", true)).toBe(true);
    expect(canAccessDesignPreview("/preview/layout", false)).toBe(false);
    expect(canAccessDesignPreview("/admin", true)).toBe(false);
  });
});
