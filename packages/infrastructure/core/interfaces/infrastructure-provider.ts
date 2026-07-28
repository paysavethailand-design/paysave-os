import type { ProviderExecutionPermit } from "../providers/execution-permit";
import type { CapabilityDescriptor } from "../models/capability";
import type {
  ProviderDecision,
  ProviderExecutionContext,
  ProviderHealth,
  ProviderInitializationContext,
} from "../models/execution";
import type { InfrastructureRequest } from "../models/request";
import type { InfrastructureResult } from "../models/result";

export type ProviderValidationDecision = ProviderDecision;
export type ProviderPreflightDecision = ProviderDecision;
export type ProviderPostflightDecision = ProviderDecision;

export interface InfrastructureProvider {
  readonly id: string;
  initialize(context: ProviderInitializationContext): Promise<void>;
  shutdown(): Promise<void>;
  health(): Promise<ProviderHealth>;
  capabilities(): readonly CapabilityDescriptor[];
  supports(capabilityId: string): boolean;
  validate(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
  ): ProviderValidationDecision;
  preflight(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderPreflightDecision>;
  execute(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
    permit: ProviderExecutionPermit,
  ): Promise<InfrastructureResult>;
  postflight(
    request: InfrastructureRequest,
    result: InfrastructureResult,
    context: ProviderExecutionContext,
  ): Promise<ProviderPostflightDecision>;
}
