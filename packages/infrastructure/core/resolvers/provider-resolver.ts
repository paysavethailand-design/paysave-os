import type { CapabilityCandidate } from "../models/capability";
import type { EnvironmentConfiguration } from "../models/environment";
import { InfrastructureError } from "../models/error";

export class ProviderResolver {
  public resolve(
    candidates: readonly CapabilityCandidate[],
    environment: EnvironmentConfiguration,
  ): CapabilityCandidate {
    const available = candidates.filter((candidate) =>
      environment.availableProviders.includes(candidate.providerId),
    );
    const boundProviderId = environment.bindings[candidates[0]?.capability.id ?? ""];

    if (boundProviderId) {
      if (!environment.availableProviders.includes(boundProviderId)) {
        throw new InfrastructureError(
          "PROVIDER_NOT_AVAILABLE_IN_ENVIRONMENT",
          `Provider ${boundProviderId} is unavailable in ${environment.environment}`,
          { providerId: boundProviderId, environment: environment.environment },
        );
      }
      const selected = available.find((candidate) => candidate.providerId === boundProviderId);
      if (!selected) {
        throw new InfrastructureError(
          "NOT_SUPPORTED",
          `Provider ${boundProviderId} does not expose the requested capability`,
          { providerId: boundProviderId },
        );
      }
      return selected;
    }

    if (available.length === 0) {
      throw new InfrastructureError(
        "PROVIDER_NOT_AVAILABLE_IN_ENVIRONMENT",
        `No candidate provider is available in ${environment.environment}`,
        { environment: environment.environment },
      );
    }
    if (available.length > 1) {
      throw new InfrastructureError(
        "AMBIGUOUS_PROVIDER_RESOLUTION",
        "Multiple providers are available and an environment binding is required",
        { candidates: available.map((candidate) => candidate.providerId) },
      );
    }
    return available[0] as CapabilityCandidate;
  }
}
