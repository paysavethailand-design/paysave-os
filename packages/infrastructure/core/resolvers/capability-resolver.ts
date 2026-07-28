import type { CapabilityCandidate } from "../models/capability";
import { InfrastructureError } from "../models/error";
import type { CapabilityRegistry } from "../registry/capability-registry";

export class CapabilityResolver {
  public constructor(private readonly registry: CapabilityRegistry) {
    Object.freeze(this);
  }

  public resolve(capabilityId: string): readonly CapabilityCandidate[] {
    const candidates = this.registry.candidates(capabilityId);
    if (candidates.length === 0) {
      throw new InfrastructureError(
        "NOT_SUPPORTED",
        `No provider supports capability ${capabilityId}`,
        { capability: capabilityId },
      );
    }
    return candidates;
  }
}
