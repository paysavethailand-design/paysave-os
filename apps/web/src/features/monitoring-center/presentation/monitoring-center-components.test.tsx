import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { MonitoringCenterView } from "./monitoring-center-view";

const model: MonitoringCenterModel = {
  generatedAt: "2026-07-27T00:00:00.000Z",
  infrastructureHealth: {
    status: "DEGRADED",
    label: "Monitoring signals require attention",
    detail: "Derived from Monitoring read models; not live provider reachability.",
  },
  providerHealth: [
    {
      id: "hostinger",
      status: "UNCONFIRMED",
      detail: "Registry membership is known; live provider reachability is not probed.",
    },
  ],
  registryHealth: {
    status: "HEALTHY",
    providers: 3,
    capabilities: 43,
    detail: "Provider and Capability Registry integrity validation passed.",
  },
  environmentStatus: [
    {
      id: "staging",
      status: "CONFIGURED",
      providers: 3,
      capabilities: 12,
      bindings: 2,
      experimental: "DISABLED",
    },
  ],
  recentEvents: [
    {
      id: "event-1",
      occurredAt: "2026-07-27T00:00:00.000Z",
      severity: "WARNING",
      source: "monitoring",
      title: "Route errors observed",
      detail: "A read-only Monitoring event.",
    },
  ],
  systemMetrics: [
    {
      id: "readiness-status",
      label: "Readiness Status",
      value: "UNKNOWN",
      kind: "GAUGE",
      description: "Latest config-only readiness signal.",
    },
    {
      id: "unhandled-route-errors",
      label: "Unhandled Route Errors",
      value: "2",
      kind: "COUNTER",
      description: "Errors in the process Monitoring snapshot.",
    },
  ],
  alerts: [
    {
      id: "provider-health-unconfirmed",
      code: "PROVIDER_HEALTH_UNCONFIRMED",
      severity: "INFO",
      title: "Provider health is unconfirmed",
      detail: "No provider call is made by this page.",
    },
    {
      id: "registry-integrity-invalid",
      code: "REGISTRY_INTEGRITY_INVALID",
      severity: "ERROR",
      title: "Registry integrity check failed",
      detail: "A read-only error fixture.",
    },
  ],
};

describe("Monitoring Center components", () => {
  it("renders all required monitoring sections without provider controls", () => {
    const html = renderToStaticMarkup(createElement(MonitoringCenterView, { model }));

    for (const heading of [
      "Monitoring Center",
      "Infrastructure Health",
      "Provider Health",
      "Registry Health",
      "Environment Status",
      "Recent Events",
      "System Metrics",
      "Warnings &amp; Alerts",
    ]) {
      expect(html).toContain(heading);
    }
    for (const label of ["DEGRADED", "UNCONFIRMED", "HEALTHY", "CONFIGURED", "UNKNOWN"])
      expect(html).toContain(label);
    expect(html).toContain("Route errors observed");
    expect(html).not.toMatch(/<button|<select|<form/);
  });

  it("renders truthful empty states for absent monitoring events and alerts", () => {
    const html = renderToStaticMarkup(
      createElement(MonitoringCenterView, {
        model: { ...model, recentEvents: [], alerts: [] },
      }),
    );

    expect(html).toContain("No recent events in the current Monitoring read model");
    expect(html).toContain("No warnings or alerts in the current snapshot");
  });
});
