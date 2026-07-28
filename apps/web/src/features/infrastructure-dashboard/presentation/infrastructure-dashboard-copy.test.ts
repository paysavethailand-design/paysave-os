import { describe, expect, it } from "vitest";
import { infrastructureDashboardSections } from "./infrastructure-dashboard-copy";

describe("Infrastructure Dashboard component contract", () => {
  it("includes every Stage 5.3A dashboard section", () => {
    expect(infrastructureDashboardSections).toEqual([
      "Dashboard Overview",
      "Provider Status",
      "Environment Status",
      "System Health",
      "Capability Summary",
      "Recent Activities",
      "Alerts & Warnings",
    ]);
  });

  it("uses the required non-actionable capability labels", () => {
    expect(infrastructureDashboardSections.join(" ")).not.toMatch(/credential|secret|token/i);
  });
});
