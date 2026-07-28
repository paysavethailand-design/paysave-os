import type { EnvironmentConfiguration, InfrastructureEnvironment } from "../core/index";
import { GITHUB_CAPABILITIES } from "../github/index";
import { HOSTINGER_CAPABILITIES } from "../hostinger/index";
import { SUPABASE_CAPABILITIES } from "../supabase/index";

const ENVIRONMENTS: readonly InfrastructureEnvironment[] = Object.freeze([
  "development",
  "internal-beta",
  "staging",
  "production",
]);

const EXECUTABLE_STATUSES = new Set(["supported", "partial"]);
const PROVIDERS = Object.freeze([
  Object.freeze({ id: "hostinger", capabilities: HOSTINGER_CAPABILITIES }),
  Object.freeze({ id: "supabase", capabilities: SUPABASE_CAPABILITIES }),
  Object.freeze({ id: "github", capabilities: GITHUB_CAPABILITIES }),
]);

/**
 * Trusted server-side environment policy. References identify credential sources only;
 * credential values are resolved inside server executors and never enter registries/manifests.
 */
export function createDefaultEnvironmentConfigurations(): readonly EnvironmentConfiguration[] {
  const bindings = Object.freeze(
    Object.fromEntries(
      PROVIDERS.flatMap((provider) =>
        provider.capabilities
          .filter((capability) => EXECUTABLE_STATUSES.has(capability.status))
          .map((capability) => [capability.id, provider.id]),
      ),
    ),
  );
  const allowedCapabilities = Object.freeze(Object.keys(bindings).sort());
  return Object.freeze(
    ENVIRONMENTS.map((environment) =>
      Object.freeze({
        environment,
        availableProviders: Object.freeze(PROVIDERS.map((provider) => provider.id)),
        experimentalCapabilities: Object.freeze([]),
        allowedCapabilities,
        bindings,
        credentialSources: Object.freeze({
          hostinger: Object.freeze({
            kind: "secret-manager" as const,
            reference: `paysave/${environment}/hostinger-provider-credentials`,
          }),
          supabase: Object.freeze({
            kind: "secret-manager" as const,
            reference: `paysave/${environment}/supabase-provider-credentials`,
          }),
          github: Object.freeze({
            kind: "workload-identity" as const,
            reference: `paysave/${environment}/github-app-identity`,
          }),
        }),
      }),
    ),
  );
}
