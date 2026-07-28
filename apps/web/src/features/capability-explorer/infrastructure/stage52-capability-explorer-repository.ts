import { INFRASTRUCTURE_PROVIDER_MANIFESTS } from "@paysave/infrastructure/read-models";
import type { CapabilityExplorerRepository } from "../application/ports/capability-explorer-repository";

export class Stage52CapabilityExplorerRepository implements CapabilityExplorerRepository {
  public constructor(private readonly clock: () => Date = () => new Date()) {}

  public async loadSnapshot() {
    const candidates = INFRASTRUCTURE_PROVIDER_MANIFESTS.flatMap((provider) =>
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
    );

    return Object.freeze({
      generatedAt: this.clock().toISOString(),
      candidates: Object.freeze(candidates),
    });
  }
}
