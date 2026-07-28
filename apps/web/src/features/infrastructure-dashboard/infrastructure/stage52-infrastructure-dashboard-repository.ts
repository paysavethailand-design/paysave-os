import {
  INFRASTRUCTURE_ENVIRONMENT_SUMMARIES,
  INFRASTRUCTURE_PROVIDER_MANIFESTS,
} from "@paysave/infrastructure/read-models";
import type {
  InfrastructureDashboardRepository,
  InfrastructureDashboardSnapshot,
} from "../application/ports/infrastructure-dashboard-repository";

/** Server-only adapter over immutable, secret-free infrastructure read models. */
export class Stage52InfrastructureDashboardRepository implements InfrastructureDashboardRepository {
  public constructor(private readonly clock: () => Date = () => new Date()) {}

  public async loadSnapshot(): Promise<InfrastructureDashboardSnapshot> {
    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      providers: Object.freeze(
        INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) =>
          Object.freeze({
            id: provider.id,
            displayName: provider.displayName,
            health: "unhealthy" as const,
            capabilities: Object.freeze(
              provider.capabilities.map((capability) =>
                Object.freeze({
                  id: capability.id,
                  category: capability.category,
                  access: capability.access,
                  status: capability.status,
                }),
              ),
            ),
          }),
        ),
      ),
      environments: Object.freeze(
        INFRASTRUCTURE_ENVIRONMENT_SUMMARIES.map((environment) =>
          Object.freeze({
            id: environment.id,
            providerIds: Object.freeze([...environment.providerIds]),
            allowedCapabilityCount: environment.allowedCapabilityCount,
            bindingCount: environment.bindingCount,
            experimentalEnabled: environment.experimentalEnabled,
          }),
        ),
      ),
      activities: Object.freeze([]),
    });
  }
}
