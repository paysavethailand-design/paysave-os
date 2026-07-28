import type { CapabilityDescriptor } from "./capability";
import type { CredentialSourceReference } from "./environment";
import type { InfrastructureEnvironment } from "./request";

export interface ProviderEnvironmentCredential {
  readonly environment: InfrastructureEnvironment;
  readonly credentialSource: CredentialSourceReference;
}

export interface ProviderInitializationContext {
  readonly providerId: string;
  readonly environments: readonly ProviderEnvironmentCredential[];
}

export interface ProviderExecutionContext {
  readonly executionId: string;
  readonly providerId: string;
  readonly capability: string;
  readonly environment: InfrastructureEnvironment;
  readonly credentialSource: CredentialSourceReference;
  readonly startedAt: string;
}

export type ProviderHealthStatus = "healthy" | "degraded" | "unhealthy" | "stopped";

export interface ProviderHealth {
  readonly providerId: string;
  readonly status: ProviderHealthStatus;
  readonly checkedAt: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type ProviderDecision =
  { readonly accepted: true } | { readonly accepted: false; readonly reason: string };

export interface ResolvedProviderExecution {
  readonly providerId: string;
  readonly capability: CapabilityDescriptor;
  readonly context: ProviderExecutionContext;
}
