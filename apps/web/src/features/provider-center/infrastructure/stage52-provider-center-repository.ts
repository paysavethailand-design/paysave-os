import { INFRASTRUCTURE_PROVIDER_MANIFESTS } from "@paysave/infrastructure/read-models";
import type {
  ProviderCenterRegistrySnapshot,
  ProviderCenterRepository,
} from "../application/ports/provider-center-repository";

/** Reads immutable provider and capability manifests without constructing providers. */
export class Stage52ProviderCenterRepository implements ProviderCenterRepository {
  public constructor(private readonly clock: () => Date = () => new Date()) {}

  public async loadSnapshot(): Promise<ProviderCenterRegistrySnapshot> {
    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      providers: Object.freeze(
        INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) =>
          Object.freeze({
            id: provider.id,
            displayName: provider.displayName,
            version: null,
            health: "unhealthy",
            registered: true,
          }),
        ),
      ),
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
