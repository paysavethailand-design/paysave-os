import { describe, expect, it } from "vitest";
import { Stage52InfrastructureDashboardRepository } from "./stage52-infrastructure-dashboard-repository";

describe("Stage52InfrastructureDashboardRepository", () => {
  it("builds a secret-free snapshot from immutable read models without provider access", async () => {
    const repository = new Stage52InfrastructureDashboardRepository(
      () => new Date("2026-07-26T12:00:00.000Z"),
    );

    const snapshot = await repository.loadSnapshot();

    expect(snapshot.providers.map((provider) => provider.id)).toEqual([
      "github",
      "hostinger",
      "supabase",
    ]);
    expect(snapshot.providers.every((provider) => provider.health === "unhealthy")).toBe(true);
    expect(snapshot.environments.map((environment) => environment.id)).toEqual([
      "development",
      "internal-beta",
      "production",
      "staging",
    ]);
    expect(snapshot.activities).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toMatch(/credential|secret-manager|token|password/i);
  });
});
