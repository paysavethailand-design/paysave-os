import { describe, expect, it } from "vitest";
import { Stage52MonitoringCenterRepository } from "./stage52-monitoring-center-repository";

describe("Stage52MonitoringCenterRepository", () => {
  it("reads immutable manifests and process monitoring state without provider access", async () => {
    const repository = new Stage52MonitoringCenterRepository(
      () => ({
        healthzRequests: 4,
        readyzRequests: 3,
        versionRequests: 2,
        metricsRequests: 1,
        unhandledRouteErrors: 0,
        readinessStatus: 1,
      }),
      () => new Date("2026-07-27T00:00:00.000Z"),
    );

    const snapshot = await repository.loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T00:00:00.000Z");
    expect(snapshot.registry).toEqual({
      integrity: "valid",
      providerCount: 3,
      capabilityCount: 43,
    });
    expect(snapshot.providers).toEqual([
      { id: "github", monitoringHealth: "unconfirmed" },
      { id: "hostinger", monitoringHealth: "unconfirmed" },
      { id: "supabase", monitoringHealth: "unconfirmed" },
    ]);
    expect(snapshot.environments).toHaveLength(4);
    expect(snapshot.metrics.readinessStatus).toBe(1);
    expect(snapshot.events).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toMatch(/credential|secret|token|password/i);
  });
});
