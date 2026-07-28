import { INFRASTRUCTURE_PROVIDER_MANIFESTS } from "@paysave/infrastructure/read-models";
import type { InfrastructureOperationsRepository } from "../application/ports/infrastructure-operations-repository";

/** Reads immutable infrastructure read models only; no provider object is constructed. */
export class Stage52InfrastructureOperationsRepository implements InfrastructureOperationsRepository {
  public constructor(private readonly clock: () => Date = () => new Date()) {}

  public async loadSnapshot() {
    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      providers: Object.freeze(INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) => provider.id)),
      capabilities: Object.freeze(
        INFRASTRUCTURE_PROVIDER_MANIFESTS.flatMap((provider) =>
          provider.capabilities.map((capability) =>
            Object.freeze({
              providerId: provider.id,
              id: capability.id,
              category: capability.category,
              plane: capability.plane,
              access: capability.access,
              status: capability.status,
            }),
          ),
        ),
      ),
    });
  }
}
