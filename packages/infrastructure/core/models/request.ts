export type InfrastructureEnvironment = "development" | "internal-beta" | "staging" | "production";

export interface InfrastructureExecutionContext {
  readonly environment: InfrastructureEnvironment;
  readonly tenantId: string;
  readonly actorId: string;
  readonly correlationId: string;
}

export interface InfrastructureRequest<TPayload = unknown> {
  readonly capability: string;
  readonly context: InfrastructureExecutionContext;
  readonly payload: TPayload;
  readonly allowExperimental?: boolean;
}
