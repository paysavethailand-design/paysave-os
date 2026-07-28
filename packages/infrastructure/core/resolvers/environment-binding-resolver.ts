import type { CapabilityCandidate } from "../models/capability";
import type { CredentialSourceReference, EnvironmentConfiguration } from "../models/environment";
import { InfrastructureError } from "../models/error";
import type { InfrastructureEnvironment } from "../models/request";

const REQUIRED_ENVIRONMENTS: readonly InfrastructureEnvironment[] = Object.freeze([
  "development",
  "internal-beta",
  "staging",
  "production",
]);

function freezeRecord<T>(source: Readonly<Record<string, T>>): Readonly<Record<string, T>> {
  return Object.freeze({ ...source });
}

function freezeProfile(profile: EnvironmentConfiguration): EnvironmentConfiguration {
  const credentials = Object.fromEntries(
    Object.entries(profile.credentialSources).map(([providerId, source]) => [
      providerId,
      Object.freeze({ ...source }) as CredentialSourceReference,
    ]),
  );
  return Object.freeze({
    environment: profile.environment,
    availableProviders: Object.freeze([...profile.availableProviders]),
    allowedCapabilities: Object.freeze([...profile.allowedCapabilities]),
    experimentalCapabilities: Object.freeze([...profile.experimentalCapabilities]),
    bindings: freezeRecord(profile.bindings),
    credentialSources: Object.freeze(credentials),
  });
}

export class EnvironmentBindingResolver {
  readonly #profiles: ReadonlyMap<InfrastructureEnvironment, EnvironmentConfiguration>;

  public constructor(configurations: readonly EnvironmentConfiguration[]) {
    const profiles = new Map<InfrastructureEnvironment, EnvironmentConfiguration>();
    for (const configuration of configurations) {
      if (profiles.has(configuration.environment)) {
        throw new InfrastructureError(
          "ENVIRONMENT_CONFIGURATION_INVALID",
          `Environment ${configuration.environment} is configured more than once`,
          { environment: configuration.environment },
        );
      }
      profiles.set(configuration.environment, freezeProfile(configuration));
    }
    const missing = REQUIRED_ENVIRONMENTS.filter((environment) => !profiles.has(environment));
    if (missing.length > 0 || profiles.size !== REQUIRED_ENVIRONMENTS.length) {
      throw new InfrastructureError(
        "ENVIRONMENT_CONFIGURATION_INVALID",
        "Exactly development, internal-beta, staging, and production must be configured",
        { missing },
      );
    }
    this.#profiles = profiles;
    Object.freeze(this);
  }

  public profiles(): readonly EnvironmentConfiguration[] {
    return Object.freeze(
      [...this.#profiles.values()].sort((left, right) =>
        left.environment.localeCompare(right.environment),
      ),
    );
  }

  public profile(environment: InfrastructureEnvironment): EnvironmentConfiguration {
    const profile = this.#profiles.get(environment);
    if (!profile) {
      throw new InfrastructureError(
        "ENVIRONMENT_CONFIGURATION_INVALID",
        `Environment ${environment} is not configured`,
        { environment },
      );
    }
    return profile;
  }

  public resolve(
    environment: InfrastructureEnvironment,
    capabilityId: string,
  ): EnvironmentConfiguration {
    const profile = this.profile(environment);
    if (!profile.allowedCapabilities.includes(capabilityId)) {
      throw new InfrastructureError(
        "CAPABILITY_NOT_ALLOWED_IN_ENVIRONMENT",
        `Capability ${capabilityId} is not allowed in ${environment}`,
        { capability: capabilityId, environment },
      );
    }
    return profile;
  }

  public applyCapabilityPolicy(
    profile: EnvironmentConfiguration,
    candidates: readonly CapabilityCandidate[],
  ): readonly CapabilityCandidate[] {
    const eligible = candidates.filter(
      (candidate) =>
        candidate.capability.status !== "experimental" ||
        profile.experimentalCapabilities.includes(candidate.capability.id),
    );
    if (eligible.length === 0) {
      const experimental = candidates.find(
        (candidate) => candidate.capability.status === "experimental",
      );
      if (experimental) {
        throw new InfrastructureError(
          "EXPERIMENTAL_CAPABILITY_DISABLED",
          `Experimental capability ${experimental.capability.id} is disabled in ${profile.environment}`,
          {
            providerId: experimental.providerId,
            capability: experimental.capability.id,
            environment: profile.environment,
          },
        );
      }
    }
    return Object.freeze([...eligible]);
  }
}
