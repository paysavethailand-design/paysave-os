import { describe, expect, it } from "vitest";
import { MockDashboardRepository } from "./mock-dashboard-repository";

describe("MockDashboardRepository", () => {
  it("returns isolated mock dashboard models for all approved personas", async () => {
    const repository = new MockDashboardRepository();
    for (const persona of ["executive", "partner", "admin", "field"] as const) {
      const model = await repository.getDashboard(persona);
      expect(model.persona).toBe(persona);
      expect(model.kpis).toHaveLength(4);
      expect(model.activity.length).toBeGreaterThan(0);
      expect(model.trend.length).toBeGreaterThan(0);
      expect(model.source).toBe("mock");
    }
  });

  it("does not expose Supabase or database dependencies", async () => {
    const model = await new MockDashboardRepository().getDashboard("executive");
    expect(JSON.stringify(model)).not.toMatch(/supabase|postgres|database/i);
  });
});
