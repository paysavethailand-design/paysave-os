import type { ProviderExecutionContext } from "../models/execution";
import type { InfrastructureRequest } from "../models/request";

const EXECUTION_PERMIT = Symbol("paysave.infrastructure.provider-execution-permit");
const activePermits = new WeakSet<object>();
const permitBindings = new WeakMap<
  object,
  {
    readonly request: InfrastructureRequest;
    readonly context: ProviderExecutionContext;
  }
>();

export interface ProviderExecutionPermit {
  readonly [EXECUTION_PERMIT]: true;
  readonly providerId: string;
  readonly capability: string;
  readonly correlationId: string;
  readonly executionId: string;
  readonly environment: string;
}

export function issueProviderExecutionPermit(
  providerId: string,
  request: InfrastructureRequest,
  context: ProviderExecutionContext,
): ProviderExecutionPermit {
  const permit = Object.freeze({
    [EXECUTION_PERMIT]: true as const,
    providerId,
    capability: request.capability,
    correlationId: request.context.correlationId,
    executionId: context.executionId,
    environment: context.environment,
  });
  activePermits.add(permit);
  permitBindings.set(permit, { request, context });
  return permit;
}

export function consumeProviderExecutionPermit(
  permit: ProviderExecutionPermit | undefined,
  providerId: string,
  request: InfrastructureRequest,
  context: ProviderExecutionContext,
): boolean {
  if (
    !permit ||
    permit[EXECUTION_PERMIT] !== true ||
    !activePermits.has(permit) ||
    permitBindings.get(permit)?.request !== request ||
    permitBindings.get(permit)?.context !== context ||
    permit.providerId !== providerId
  ) {
    return false;
  }
  activePermits.delete(permit);
  permitBindings.delete(permit);
  return true;
}
