import { describe, expect, it } from "vitest";
import { getInfrastructureDashboard } from "./get-infrastructure-dashboard";
import type { InfrastructureDashboardRepository } from "../ports/infrastructure-dashboard-repository";

const repository: InfrastructureDashboardRepository = {
  async loadSnapshot() {
    return {
      generatedAt: "2026-07-26T12:00:00.000Z",
      providers: [
        {
          id: "hostinger",
          displayName: "Hostinger",
          health: "healthy",
          capabilities: [
            { id: "dns.record.read", category: "dns", access: "read", status: "supported" },
            { id: "ssl.manage", category: "ssl", access: "write", status: "unsupported" },
            {
              id: "hosting.docker-manager",
              category: "hosting",
              access: "write",
              status: "experimental",
            },
          ],
        },
        {
          id: "github",
          displayName: "GitHub",
          health: "degraded",
          capabilities: [
            { id: "release.create", category: "release", access: "write", status: "partial" },
          ],
        },
      ],
      environments: [
        {
          id: "internal-beta",
          providerIds: ["hostinger", "github"],
          allowedCapabilityCount: 4,
          bindingCount: 4,
          experimentalEnabled: false,
        },
      ],
      activities: [
        {
          id: "activity-1",
          providerId: "github",
          capabilityId: "release.create",
          environment: "internal-beta",
          outcome: "failed",
          stage: "execution",
          occurredAt: "2026-07-26T11:58:00.000Z",
        },
      ],
    };
  },
};

describe("getInfrastructureDashboard", () => {
  it("projects provider, environment, health, capability, activity, and alert sections", async () => {
    const model = await getInfrastructureDashboard(repository);

    expect(model.overview).toEqual({
      providers: 2,
      healthyProviders: 1,
      environments: 1,
      supportedCapabilities: 2,
    });
    expect(model.systemHealth).toMatchObject({ status: "degraded" });
    expect(model.capabilities.map((item) => [item.id, item.availability])).toEqual([
      ["release.create", "AVAILABLE"],
      ["dns.record.read", "AVAILABLE"],
      ["hosting.docker-manager", "EXPERIMENTAL DISABLED"],
      ["ssl.manage", "NOT SUPPORTED"],
    ]);
    expect(model.environments[0]).toMatchObject({
      id: "internal-beta",
      experimentalStatus: "DISABLED",
    });
    expect(model.activities).toHaveLength(1);
    expect(model.alerts.some((alert) => alert.code === "PROVIDER_DEGRADED")).toBe(true);
    expect(model.alerts.some((alert) => alert.code === "EXPERIMENTAL_DISABLED")).toBe(true);
    expect(model.alerts.some((alert) => alert.code === "CAPABILITY_NOT_SUPPORTED")).toBe(true);
  });

  it("never exposes credential or secret fields in the dashboard model", async () => {
    const model = await getInfrastructureDashboard(repository);
    expect(JSON.stringify(model)).not.toMatch(/credential|secret|token|password/i);
  });
});
