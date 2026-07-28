import { InfrastructureError } from "../models/error";
import type { CapabilityRegistry } from "../registry/capability-registry";
import type { ProviderRegistry } from "../registry/provider-registry";
import type { EnvironmentBindingResolver } from "../resolvers/environment-binding-resolver";

/** Pure, read-only consistency validation. It never initializes or invokes a provider. */
export class EnvironmentConfigurationValidator {
  public validate(
    providers: ProviderRegistry,
    capabilities: CapabilityRegistry,
    environments: EnvironmentBindingResolver,
  ): void {
    for (const environment of environments.profiles()) {
      for (const providerId of environment.availableProviders) {
        try {
          providers.get(providerId);
        } catch {
          throw new InfrastructureError(
            "ENVIRONMENT_CONFIGURATION_INVALID",
            `Unknown provider ${providerId} in ${environment.environment}`,
            { providerId, environment: environment.environment },
          );
        }
        if (!environment.credentialSources[providerId]) {
          throw new InfrastructureError(
            "ENVIRONMENT_CONFIGURATION_INVALID",
            `Missing credential source for ${providerId} in ${environment.environment}`,
            { providerId, environment: environment.environment },
          );
        }
      }

      for (const [capabilityId, providerId] of Object.entries(environment.bindings)) {
        if (
          !environment.allowedCapabilities.includes(capabilityId) ||
          !environment.availableProviders.includes(providerId) ||
          !capabilities.get(providerId, capabilityId)
        ) {
          throw new InfrastructureError(
            "ENVIRONMENT_CONFIGURATION_INVALID",
            `Invalid binding ${capabilityId} -> ${providerId} in ${environment.environment}`,
            { capability: capabilityId, providerId, environment: environment.environment },
          );
        }
      }

      for (const capabilityId of environment.experimentalCapabilities) {
        const candidate = capabilities
          .candidates(capabilityId)
          .find((item) => environment.availableProviders.includes(item.providerId));
        if (!candidate || candidate.capability.status !== "experimental") {
          throw new InfrastructureError(
            "ENVIRONMENT_CONFIGURATION_INVALID",
            `Experimental policy references non-experimental capability ${capabilityId}`,
            { capability: capabilityId, environment: environment.environment },
          );
        }
      }
    }
  }
}
