import {
  consumeProviderExecutionPermit,
  type ProviderExecutionPermit,
} from "../core/providers/execution-permit";
import { InfrastructureError } from "../core/index";
import type {
  CapabilityDescriptor,
  InfrastructureProvider,
  InfrastructureRequest,
  InfrastructureResult,
  ProviderExecutionContext,
  ProviderHealth,
  ProviderInitializationContext,
  ProviderPostflightDecision,
  ProviderPreflightDecision,
  ProviderValidationDecision,
} from "../core/index";
import type { ProviderExecutor } from "./provider-executor";

function payloadResourceType(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object" || !("resourceType" in payload)) return undefined;
  const value = (payload as { readonly resourceType?: unknown }).resourceType;
  return typeof value === "string" ? value : undefined;
}

function freezeCapability(capability: CapabilityDescriptor): CapabilityDescriptor {
  return Object.freeze({
    ...capability,
    officialReferences: Object.freeze([...capability.officialReferences]),
    ...(capability.limitations ? { limitations: Object.freeze([...capability.limitations]) } : {}),
    ...(capability.requiredResourceTypes
      ? { requiredResourceTypes: Object.freeze([...capability.requiredResourceTypes]) }
      : {}),
  });
}

export class ManifestInfrastructureProvider implements InfrastructureProvider {
  readonly #capabilities: readonly CapabilityDescriptor[];
  #initialization: ProviderInitializationContext | undefined;

  public constructor(
    public readonly id: string,
    capabilities: readonly CapabilityDescriptor[],
    private readonly executor: ProviderExecutor,
  ) {
    this.#capabilities = Object.freeze(capabilities.map(freezeCapability));
  }

  public async initialize(context: ProviderInitializationContext): Promise<void> {
    this.#initialization = Object.freeze({
      providerId: context.providerId,
      environments: Object.freeze(
        context.environments.map((item) =>
          Object.freeze({
            environment: item.environment,
            credentialSource: Object.freeze({ ...item.credentialSource }),
          }),
        ),
      ),
    });
  }

  public async shutdown(): Promise<void> {
    this.#initialization = undefined;
  }

  public async health(): Promise<ProviderHealth> {
    return Object.freeze({
      providerId: this.id,
      status: this.#initialization ? "healthy" : "stopped",
      checkedAt: new Date().toISOString(),
    });
  }

  public capabilities(): readonly CapabilityDescriptor[] {
    return this.#capabilities;
  }

  public supports(capabilityId: string): boolean {
    return this.#capabilities.some((capability) => capability.id === capabilityId);
  }

  public validate(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
  ): ProviderValidationDecision {
    if (
      context.providerId !== this.id ||
      context.capability !== request.capability ||
      context.environment !== request.context.environment
    ) {
      return { accepted: false, reason: "Execution context does not match request" };
    }
    if (!this.supports(request.capability)) {
      return { accepted: false, reason: "Capability is absent from provider manifest" };
    }
    return { accepted: true };
  }

  public async preflight(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
  ): Promise<ProviderPreflightDecision> {
    const validation = this.validate(request, context);
    if (!validation.accepted) return validation;
    const capability = this.#capabilities.find((item) => item.id === request.capability);
    if (!capability)
      return { accepted: false, reason: "Capability is absent from provider manifest" };
    if (
      ["unconfirmed", "unsupported", "not_entitled", "unavailable", "deprecated"].includes(
        capability.status,
      )
    ) {
      return { accepted: false, reason: `Capability status is ${capability.status}` };
    }
    if (capability.status === "experimental" && !request.allowExperimental) {
      return {
        accepted: false,
        reason: "Experimental capability requires explicit request opt-in",
      };
    }
    if (capability.requiredResourceTypes && capability.requiredResourceTypes.length > 0) {
      const resourceType = payloadResourceType(request.payload);
      if (!resourceType || !capability.requiredResourceTypes.includes(resourceType)) {
        return {
          accepted: false,
          reason: `Capability requires resource type: ${capability.requiredResourceTypes.join(", ")}`,
        };
      }
    }
    return { accepted: true };
  }

  public async execute(
    request: InfrastructureRequest,
    context: ProviderExecutionContext,
    permit: ProviderExecutionPermit,
  ): Promise<InfrastructureResult> {
    if (!consumeProviderExecutionPermit(permit, this.id, request, context)) {
      throw new InfrastructureError(
        "PROVIDER_EXECUTION_NOT_AUTHORIZED",
        `Provider ${this.id} may execute only through InfrastructureRegistry`,
        { capability: request.capability, providerId: this.id },
      );
    }
    if (!this.#initialization) {
      throw new InfrastructureError(
        "PROVIDER_NOT_INITIALIZED",
        `Provider ${this.id} is not initialized`,
        { providerId: this.id },
      );
    }
    const configuredCredential = this.#initialization.environments.find(
      (item) => item.environment === context.environment,
    )?.credentialSource;
    if (
      !configuredCredential ||
      configuredCredential.kind !== context.credentialSource.kind ||
      configuredCredential.reference !== context.credentialSource.reference
    ) {
      throw new InfrastructureError(
        "PROVIDER_EXECUTION_NOT_AUTHORIZED",
        `Provider ${this.id} rejected an untrusted credential source`,
        { providerId: this.id, environment: context.environment },
      );
    }
    const decision = await this.preflight(request, context);
    if (decision.accepted === false) {
      throw new InfrastructureError("PROVIDER_CAPABILITY_REJECTED", decision.reason, {
        capability: request.capability,
        providerId: this.id,
      });
    }
    const capability = this.#capabilities.find((item) => item.id === request.capability);
    if (!capability) {
      throw new InfrastructureError(
        "NOT_SUPPORTED",
        `Capability ${request.capability} is absent from provider ${this.id}`,
        { capability: request.capability, providerId: this.id },
      );
    }
    return this.executor.execute(this.id, request, capability, context);
  }

  public async postflight(
    request: InfrastructureRequest,
    result: InfrastructureResult,
    context: ProviderExecutionContext,
  ): Promise<ProviderPostflightDecision> {
    if (
      result.providerId !== this.id ||
      result.capability !== request.capability ||
      result.correlationId !== request.context.correlationId ||
      context.providerId !== this.id
    ) {
      return { accepted: false, reason: "Provider result does not match execution context" };
    }
    return { accepted: true };
  }
}
