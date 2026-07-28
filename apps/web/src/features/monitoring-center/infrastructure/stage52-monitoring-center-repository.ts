import {
  INFRASTRUCTURE_ENVIRONMENT_SUMMARIES,
  INFRASTRUCTURE_PROVIDER_MANIFESTS,
} from "@paysave/infrastructure/read-models";
import { readOperationalMetricsState } from "@paysave/observability";
import type {
  MonitoringCenterRepository,
  MonitoringCenterSnapshot,
} from "../application/ports/monitoring-center-repository";

type MetricsSnapshot = MonitoringCenterSnapshot["metrics"];

/** Immutable infrastructure + monitoring read-model adapter with no provider access. */
export class Stage52MonitoringCenterRepository implements MonitoringCenterRepository {
  public constructor(
    private readonly readMetrics: () => MetricsSnapshot = readOperationalMetricsState,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  public async loadSnapshot(): Promise<MonitoringCenterSnapshot> {
    const capabilityCount = INFRASTRUCTURE_PROVIDER_MANIFESTS.reduce(
      (total, provider) => total + provider.capabilities.length,
      0,
    );
    const uniqueProviderCount = new Set(
      INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) => provider.id),
    ).size;
    const integrity =
      uniqueProviderCount === INFRASTRUCTURE_PROVIDER_MANIFESTS.length && capabilityCount > 0
        ? "valid"
        : "invalid";

    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      registry: Object.freeze({
        integrity,
        providerCount: INFRASTRUCTURE_PROVIDER_MANIFESTS.length,
        capabilityCount,
      }),
      providers: Object.freeze(
        INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) =>
          Object.freeze({ id: provider.id, monitoringHealth: "unconfirmed" as const }),
        ),
      ),
      environments: Object.freeze(
        INFRASTRUCTURE_ENVIRONMENT_SUMMARIES.map((environment) =>
          Object.freeze({
            id: environment.id,
            providerCount: environment.providerIds.length,
            capabilityCount: environment.allowedCapabilityCount,
            bindingCount: environment.bindingCount,
            experimentalEnabled: environment.experimentalEnabled,
          }),
        ),
      ),
      metrics: Object.freeze({ ...this.readMetrics() }),
      events: Object.freeze([]),
    });
  }
}
