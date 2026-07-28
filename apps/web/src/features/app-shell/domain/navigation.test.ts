import { describe, expect, it } from "vitest";
import type { AuthContext } from "@paysave/security";
import { getVisibleNavigation } from "./navigation";

const agentContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "42",
  roles: ["agent"],
  permissions: ["cases.read", "assignments.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

describe("getVisibleNavigation", () => {
  it("shows only navigation allowed by verified permissions", () => {
    expect(getVisibleNavigation(agentContext).map((item) => item.key)).toEqual([
      "dashboard",
      "business",
      "cases",
      "assignments",
    ]);
  });

  it("routes reports navigation to the sealed Business Reports module", () => {
    const context: AuthContext = { ...agentContext, permissions: ["reports.read"] };
    expect(getVisibleNavigation(context).find((item) => item.key === "reports")?.href).toBe(
      "/business/reports",
    );
  });

  it("does not grant admin navigation from a role name alone", () => {
    expect(getVisibleNavigation(agentContext).some((item) => item.key === "admin")).toBe(false);
  });
});
