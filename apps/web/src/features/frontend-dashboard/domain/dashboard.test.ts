import { describe, expect, it } from "vitest";
import { canAccessDashboard, dashboardPersonas, isDashboardPersona } from "./dashboard";

describe("dashboard role personas", () => {
  it("exposes the canonical supervisor and personal dashboard routes", () => {
    expect(dashboardPersonas).toContain("supervisor");
    expect(dashboardPersonas).toContain("personal");
    expect(isDashboardPersona("supervisor")).toBe(true);
    expect(isDashboardPersona("personal")).toBe(true);
  });

  it("allows only the matching application roles into the new personas", () => {
    expect(canAccessDashboard("supervisor", ["supervisor"])).toBe(true);
    expect(canAccessDashboard("supervisor", ["agent"])).toBe(false);
    expect(canAccessDashboard("personal", ["agent"])).toBe(true);
    expect(canAccessDashboard("personal", ["supervisor"])).toBe(false);
  });

  it("keeps both supported admin roles on the admin dashboard", () => {
    expect(canAccessDashboard("admin", ["super_admin"])).toBe(true);
    expect(canAccessDashboard("admin", ["admin"])).toBe(true);
  });

  it.each(["executive", "admin", "partner", "field", "supervisor", "personal"] as const)(
    "allows tenant admin roles into the %s dashboard",
    (persona) => {
      expect(canAccessDashboard(persona, ["admin"])).toBe(true);
      expect(canAccessDashboard(persona, ["super_admin"])).toBe(true);
    },
  );

  it("does not widen partner, supervisor, or agent beyond their original dashboards", () => {
    expect(canAccessDashboard("partner", ["partner"])).toBe(true);
    expect(canAccessDashboard("admin", ["partner"])).toBe(false);
    expect(canAccessDashboard("supervisor", ["supervisor"])).toBe(true);
    expect(canAccessDashboard("field", ["supervisor"])).toBe(true);
    expect(canAccessDashboard("partner", ["supervisor"])).toBe(false);
    expect(canAccessDashboard("personal", ["agent"])).toBe(true);
    expect(canAccessDashboard("field", ["agent"])).toBe(true);
    expect(canAccessDashboard("partner", ["agent"])).toBe(false);
  });
});
