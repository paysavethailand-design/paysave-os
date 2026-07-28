import type { InfrastructureEnvironment } from "./request";

export type CredentialSourceKind = "environment" | "secret-manager" | "workload-identity";

export interface CredentialSourceReference {
  readonly kind: CredentialSourceKind;
  /** Reference/name only. Secret values are forbidden in platform configuration. */
  readonly reference: string;
}

export interface EnvironmentConfiguration {
  readonly environment: InfrastructureEnvironment;
  readonly availableProviders: readonly string[];
  readonly allowedCapabilities: readonly string[];
  readonly experimentalCapabilities: readonly string[];
  readonly bindings: Readonly<Record<string, string>>;
  readonly credentialSources: Readonly<Record<string, CredentialSourceReference>>;
}
