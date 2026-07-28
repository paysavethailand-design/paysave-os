import type {
  MonitoringCenterModel,
  MonitoringHealthStatus,
  MonitoringProviderStatus,
} from "../../domain/monitoring-center";
import type { MonitoringCenterRepository } from "../ports/monitoring-center-repository";

function providerStatus(status: string): MonitoringProviderStatus {
  if (status === "healthy") return "HEALTHY";
  if (status === "degraded") return "DEGRADED";
  if (status === "unhealthy") return "UNHEALTHY";
  return "UNCONFIRMED";
}

export async function getMonitoringCenter(
  repository: MonitoringCenterRepository,
): Promise<MonitoringCenterModel> {
  const snapshot = await repository.loadSnapshot();
  const providers = [...snapshot.providers]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((provider) => ({
      id: provider.id,
      status: providerStatus(provider.monitoringHealth),
      detail:
        provider.monitoringHealth === "unconfirmed"
          ? "Registry membership is known; live provider reachability is not probed."
          : "Status supplied by the Monitoring read model; no provider call was made by this page.",
    }));

  let infrastructureStatus: MonitoringHealthStatus = "UNKNOWN";
  if (snapshot.registry.integrity === "invalid") infrastructureStatus = "UNHEALTHY";
  else if (snapshot.metrics.unhandledRouteErrors > 0) infrastructureStatus = "DEGRADED";
  else if (snapshot.metrics.readinessStatus === 1) infrastructureStatus = "HEALTHY";

  const alerts: MonitoringCenterModel["alerts"][number][] = [];
  if (snapshot.registry.integrity === "invalid") {
    alerts.push({
      id: "registry-integrity",
      code: "REGISTRY_INTEGRITY_INVALID",
      severity: "ERROR",
      title: "Registry integrity check failed",
      detail: "The registry snapshot did not pass integrity validation.",
    });
  }
  if (snapshot.metrics.unhandledRouteErrors > 0) {
    alerts.push({
      id: "unhandled-route-errors",
      code: "UNHANDLED_ROUTE_ERRORS",
      severity: "WARNING",
      title: "Unhandled route errors observed",
      detail: `${snapshot.metrics.unhandledRouteErrors} errors are present in the current process metrics snapshot.`,
    });
  }
  if (snapshot.metrics.readinessStatus === 0) {
    alerts.push({
      id: "readiness-unknown",
      code: "READINESS_UNKNOWN",
      severity: "INFO",
      title: "Readiness signal is unknown",
      detail: "The latest config-only readiness signal is not ready or has not been recorded.",
    });
  }
  const unconfirmedProviders = providers.filter((provider) => provider.status === "UNCONFIRMED");
  if (unconfirmedProviders.length > 0) {
    alerts.push({
      id: "provider-health-unconfirmed",
      code: "PROVIDER_HEALTH_UNCONFIRMED",
      severity: "INFO",
      title: "Provider health is unconfirmed",
      detail: `${unconfirmedProviders.length} registered providers have no Monitoring read-model health signal.`,
    });
  }

  return {
    generatedAt: snapshot.generatedAt,
    infrastructureHealth: {
      status: infrastructureStatus,
      label:
        infrastructureStatus === "HEALTHY"
          ? "Monitoring signals are healthy"
          : infrastructureStatus === "DEGRADED"
            ? "Monitoring signals require attention"
            : infrastructureStatus === "UNHEALTHY"
              ? "Registry monitoring is unhealthy"
              : "Infrastructure health is unknown",
      detail:
        "Derived from registry integrity and process Monitoring read models; this is not live provider reachability.",
    },
    providerHealth: providers,
    registryHealth: {
      status: snapshot.registry.integrity === "valid" ? "HEALTHY" : "UNHEALTHY",
      providers: snapshot.registry.providerCount,
      capabilities: snapshot.registry.capabilityCount,
      detail:
        snapshot.registry.integrity === "valid"
          ? "Provider and Capability Registry integrity validation passed."
          : "Provider and Capability Registry integrity validation failed.",
    },
    environmentStatus: [...snapshot.environments]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((environment) => ({
        id: environment.id,
        status: "CONFIGURED" as const,
        providers: environment.providerCount,
        capabilities: environment.capabilityCount,
        bindings: environment.bindingCount,
        experimental: environment.experimentalEnabled
          ? ("ENABLED" as const)
          : ("DISABLED" as const),
      })),
    recentEvents: [...snapshot.events]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 10)
      .map((event) => ({
        ...event,
        severity: event.severity.toUpperCase() as "INFO" | "WARNING" | "ERROR",
      })),
    systemMetrics: [
      {
        id: "healthz-requests",
        label: "Health Requests",
        value: String(snapshot.metrics.healthzRequests),
        kind: "COUNTER",
        description: "Observed /healthz requests since process start.",
      },
      {
        id: "readyz-requests",
        label: "Readiness Requests",
        value: String(snapshot.metrics.readyzRequests),
        kind: "COUNTER",
        description: "Observed /readyz requests since process start.",
      },
      {
        id: "version-requests",
        label: "Version Requests",
        value: String(snapshot.metrics.versionRequests),
        kind: "COUNTER",
        description: "Observed /version requests since process start.",
      },
      {
        id: "metrics-requests",
        label: "Metrics Requests",
        value: String(snapshot.metrics.metricsRequests),
        kind: "COUNTER",
        description: "Observed /metrics requests since process start.",
      },
      {
        id: "unhandled-route-errors",
        label: "Unhandled Route Errors",
        value: String(snapshot.metrics.unhandledRouteErrors),
        kind: "COUNTER",
        description: "Unhandled route errors recorded in the current process.",
      },
      {
        id: "readiness-status",
        label: "Readiness Status",
        value: snapshot.metrics.readinessStatus === 1 ? "READY" : "UNKNOWN",
        kind: "GAUGE",
        description: "Latest config-only readiness signal; UNKNOWN includes not yet recorded.",
      },
    ],
    alerts,
  };
}
