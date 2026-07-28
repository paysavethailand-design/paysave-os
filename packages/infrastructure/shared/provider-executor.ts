import type {
  CapabilityDescriptor,
  InfrastructureRequest,
  InfrastructureResult,
  ProviderExecutionContext,
} from "../core/index";

/** Server-composed execution boundary. Credential resolution belongs inside its implementation. */
export interface ProviderExecutor {
  execute(
    providerId: string,
    request: InfrastructureRequest,
    capability: CapabilityDescriptor,
    context: ProviderExecutionContext,
  ): Promise<InfrastructureResult>;
}
