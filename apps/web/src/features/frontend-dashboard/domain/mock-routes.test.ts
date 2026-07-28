import { describe, expect, it } from "vitest";
import { isMockFrontendPath } from "./mock-routes";

describe("isMockFrontendPath", () => {
  it.each([
    "/",
    "/login",
    "/dashboard/executive",
    "/dashboard/field",
    "/recovery/cases",
    "/recovery/cases/RC-2026-0018",
    "/recovery/assignments",
  ])("bypasses live auth for %s", (path) => {
    expect(isMockFrontendPath(path)).toBe(true);
  });

  it.each(["/api/v1/users", "/sign-in", "/auth/callback"])(
    "preserves backend auth for %s",
    (path) => {
      expect(isMockFrontendPath(path)).toBe(false);
    },
  );
});
