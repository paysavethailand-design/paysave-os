import type { InfrastructureDashboardRepository } from "../ports/infrastructure-dashboard-repository";
import type {
  CapabilityAvailability,
  DashboardHealthStatus,
  InfrastructureDashboardModel,
} from "../../domain/infrastructure-dashboard";

const SUPPORTED_STATUSES = new Set(["supported", "partial"]);

function healthStatus(status: string): DashboardHealthStatus {
  if (status === "healthy") return "healthy";
  if (status === "degraded") return "degraded";
  return "unavailable";
}

function availability(status: string): CapabilityAvailability {
  if (SUPPORTED_STATUSES.has(status)) return "AVAILABLE";
  if (status === "experimental") return "EXPERIMENTAL DISABLED";
  return "NOT SUPPORTED";
}

/** Produces the secret-free dashboard read model exclusively through the Application Layer port. */
export async function getInfrastructureDashboard(
  repository: InfrastructureDashboardRepository,
): Promise<InfrastructureDashboardModel> {
  const snapshot = await repository.loadSnapshot();
  const providers = [...snapshot.providers]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map((provider) => {
      const states = provider.capabilities.map((item) => availability(item.status));
      return {
        id: provider.id,
        name: provider.displayName,
        status: healthStatus(provider.health),
        supportedCapabilities: states.filter((state) => state === "AVAILABLE").length,
        experimentalCapabilities: states.filter((state) => state === "EXPERIMENTAL DISABLED")
          .length,
        unsupportedCapabilities: states.filter((state) => state === "NOT SUPPORTED").length,
      };
    });

  const capabilities = [...snapshot.providers]
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((provider) =>
      provider.capabilities.map((capability) => ({
        providerId: provider.id,
        providerName: provider.displayName,
        id: capability.id,
        category: capability.category,
        access: capability.access,
        availability: availability(capability.status),
      })),
    )
    .sort(
      (left, right) =>
        left.providerId.localeCompare(right.providerId) || left.id.localeCompare(right.id),
    );

  const alerts: InfrastructureDashboardModel["alerts"][number][] = [];
  for (const provider of providers) {
    if (provider.status !== "healthy") {
      alerts.push({
        id: `provider:${provider.id}`,
        code: "PROVIDER_DEGRADED",
        severity: "warning",
        title: `${provider.name} requires attention`,
        detail: `Provider health is ${provider.status.toUpperCase()}.`,
      });
    }
  }
  for (const capability of capabilities) {
    if (capability.availability === "EXPERIMENTAL DISABLED") {
      alerts.push({
        id: `experimental:${capability.providerId}:${capability.id}`,
        code: "EXPERIMENTAL_DISABLED",
        severity: "info",
        title: `${capability.id} is disabled`,
        detail: `${capability.providerName} marks this capability as experimental.`,
      });
    }
    if (capability.availability === "NOT SUPPORTED") {
      alerts.push({
        id: `unsupported:${capability.providerId}:${capability.id}`,
        code: "CAPABILITY_NOT_SUPPORTED",
        severity: "info",
        title: `${capability.id} is not supported`,
        detail: `${capability.providerName} does not expose this feature for execution.`,
      });
    }
  }

  const healthyProviders = providers.filter((provider) => provider.status === "healthy").length;
  const overallHealth: DashboardHealthStatus =
    providers.length === 0
      ? "unavailable"
      : healthyProviders === providers.length
        ? "healthy"
        : "degraded";

  return {
    generatedAt: snapshot.generatedAt,
    overview: {
      providers: providers.length,
      healthyProviders,
      environments: snapshot.environments.length,
      supportedCapabilities: capabilities.filter(
        (capability) => capability.availability === "AVAILABLE",
      ).length,
    },
    systemHealth: {
      status: overallHealth,
      label:
        overallHealth === "healthy"
          ? "All infrastructure systems operational"
          : overallHealth === "degraded"
            ? "Infrastructure requires attention"
            : "Infrastructure status unavailable",
      detail: `${healthyProviders} of ${providers.length} providers report healthy status.`,
    },
    providers,
    environments: [...snapshot.environments]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((environment) => ({
        id: environment.id,
        providers: environment.providerIds.length,
        allowedCapabilities: environment.allowedCapabilityCount,
        bindings: environment.bindingCount,
        experimentalStatus: environment.experimentalEnabled ? "ENABLED" : "DISABLED",
      })),
    capabilities,
    activities: [...snapshot.activities]
      .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
      .slice(0, 10)
      .map((activity) => ({
        id: activity.id,
        providerId: activity.providerId ?? "unresolved",
        capabilityId: activity.capabilityId,
        environment: activity.environment,
        outcome: activity.outcome.toUpperCase(),
        stage: activity.stage,
        occurredAt: activity.occurredAt,
      })),
    alerts: alerts.slice(0, 12),
  };
}
