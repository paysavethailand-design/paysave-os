export { CAPABILITIES, type KnownCapabilityId } from "./capabilities/catalog";
export type {
  InfrastructureProvider,
  ProviderPostflightDecision,
  ProviderPreflightDecision,
  ProviderValidationDecision,
} from "./interfaces/infrastructure-provider";
export type {
  CapabilityAccess,
  CapabilityCandidate,
  CapabilityDescriptor,
  CapabilityPlane,
  CapabilityStatus,
} from "./models/capability";
export {
  INFRASTRUCTURE_EXECUTION_STAGES,
  InMemoryProviderExecutionAudit,
  type InfrastructureExecutionStage,
  type ProviderExecutionAudit,
  type ProviderExecutionAuditEvent,
  type ProviderExecutionAuditOutcome,
} from "./models/audit";
export type {
  CredentialSourceKind,
  CredentialSourceReference,
  EnvironmentConfiguration,
} from "./models/environment";
export type {
  ProviderDecision,
  ProviderExecutionContext,
  ProviderEnvironmentCredential,
  ProviderHealth,
  ProviderHealthStatus,
  ProviderInitializationContext,
  ResolvedProviderExecution,
} from "./models/execution";
export { InfrastructureError, type InfrastructureErrorCode } from "./models/error";
export type {
  InfrastructureEnvironment,
  InfrastructureExecutionContext,
  InfrastructureRequest,
} from "./models/request";
export type { InfrastructureResult } from "./models/result";
export { CapabilityRegistry, type CapabilityRegistration } from "./registry/capability-registry";
export { CapabilityNegotiator } from "./resolvers/capability-negotiator";
export { CapabilityResolver } from "./resolvers/capability-resolver";
export { EnvironmentBindingResolver } from "./resolvers/environment-binding-resolver";
export { ProviderResolver } from "./resolvers/provider-resolver";
export {
  InfrastructureRegistry,
  type CapabilityResolution,
  type InfrastructureRegistryOptions,
} from "./registry/infrastructure-registry";
export { EnvironmentConfigurationValidator } from "./validation/environment-configuration-validator";
export { ProviderContractValidator } from "./validation/provider-contract-validator";
export { RegistryIntegrityValidator } from "./validation/registry-integrity-validator";
export { ProviderRegistry } from "./registry/provider-registry";
