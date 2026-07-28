export type InfrastructureErrorCode =
  | "NOT_SUPPORTED"
  | "CAPABILITY_NOT_ALLOWED_IN_ENVIRONMENT"
  | "ENVIRONMENT_CONFIGURATION_INVALID"
  | "PROVIDER_NOT_AVAILABLE_IN_ENVIRONMENT"
  | "AMBIGUOUS_PROVIDER_RESOLUTION"
  | "EXPERIMENTAL_CAPABILITY_DISABLED"
  | "PROVIDER_ALREADY_REGISTERED"
  | "PROVIDER_NOT_REGISTERED"
  | "PROVIDER_EXECUTION_NOT_AUTHORIZED"
  | "REGISTRY_INTEGRITY_VIOLATION"
  | "PROVIDER_CAPABILITY_REJECTED"
  | "PROVIDER_CONTRACT_INVALID"
  | "PROVIDER_NOT_INITIALIZED"
  | "PROVIDER_POSTFLIGHT_REJECTED"
  | "PROVIDER_CAPABILITY_ALREADY_REGISTERED";

export class InfrastructureError extends Error {
  public constructor(
    public readonly code: InfrastructureErrorCode,
    message: string,
    public readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}
