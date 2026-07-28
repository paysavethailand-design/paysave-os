import { describe, expect, it } from "vitest";
import type { MonitoringCenterRepository } from "../ports/monitoring-center-repository";
import { getMonitoringCenter } from "./get-monitoring-center";

const repository: MonitoringCenterRepository = {
  async loadSnapshot() {
    return {
      generatedAt: "2026-07-27T00:00:00.000Z",
      registry: { integrity: "valid", providerCount: 2, capabilityCount: 8 },
      providers: [
        { id: "hostinger", monitoringHealth: "healthy" },
        { id: "supabase", monitoringHealth: "unconfirmed" },
      ],
      environments: [
        {
          id: "staging",
          providerCount: 2,
          capabilityCount: 5,
          bindingCount: 2,
          experimentalEnabled: false,
        },
      ],
      metrics: {
        healthzRequests: 9,
        readyzRequests: 3,
        versionRequests: 2,
        metricsRequests: 1,
        unhandledRouteErrors: 2,
        readinessStatus: 1,
      },
      events: [
        {
          id: "event-1",
          occurredAt: "2026-07-27T00:01:00.000Z",
          severity: "warning",
          source: "monitoring",
          title: "Route errors observed",
          detail: "Two unhandled route errors were recorded.",
        },
      ],
    };
  },
};

describe("getMonitoringCenter", () => {
  it("projects registry and monitoring snapshots without claiming live provider reachability", async () => {
    const model = await getMonitoringCenter(repository);

    expect(model.infrastructureHealth.status).toBe("DEGRADED");
    expect(model.providerHealth).toEqual([
      expect.objectContaining({ id: "hostinger", status: "HEALTHY" }),
      expect.objectContaining({ id: "supabase", status: "UNCONFIRMED" }),
    ]);
    expect(model.registryHealth).toEqual(
      expect.objectContaining({ status: "HEALTHY", providers: 2, capabilities: 8 }),
    );
    expect(model.environmentStatus[0]).toEqual(
      expect.objectContaining({ id: "staging", status: "CONFIGURED" }),
    );
    expect(model.systemMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "unhandled-route-errors", value: "2" }),
        expect.objectContaining({ id: "readiness-status", value: "READY" }),
      ]),
    );
    expect(model.recentEvents).toHaveLength(1);
    expect(model.alerts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNHANDLED_ROUTE_ERRORS", severity: "WARNING" }),
        expect.objectContaining({ code: "PROVIDER_HEALTH_UNCONFIRMED", severity: "INFO" }),
      ]),
    );
  });
});
