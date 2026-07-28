import type { InfrastructureProvider } from "../interfaces/infrastructure-provider";
import {
  InMemoryProviderExecutionAudit,
  type InfrastructureExecutionStage,
  type ProviderExecutionAudit,
  type ProviderExecutionAuditEvent,
} from "../models/audit";
import type { CapabilityDescriptor } from "../models/capability";
import type { EnvironmentConfiguration } from "../models/environment";
import { InfrastructureError } from "../models/error";
import type { ProviderExecutionContext } from "../models/execution";
import type { InfrastructureRequest } from "../models/request";
import type { InfrastructureResult } from "../models/result";
import { issueProviderExecutionPermit } from "../providers/execution-permit";
import { CapabilityNegotiator } from "../resolvers/capability-negotiator";
import { CapabilityResolver } from "../resolvers/capability-resolver";
import { EnvironmentBindingResolver } from "../resolvers/environment-binding-resolver";
import { ProviderResolver } from "../resolvers/provider-resolver";
import { RegistryIntegrityValidator } from "../validation/registry-integrity-validator";
import type { CapabilityRegistry } from "./capability-registry";
import type { ProviderRegistry } from "./provider-registry";

export interface CapabilityResolution {
  readonly provider: InfrastructureProvider;
  readonly capability: CapabilityDescriptor;
  readonly environment: EnvironmentConfiguration;
  readonly context: ProviderExecutionContext;
}

export interface InfrastructureRegistryOptions {
  readonly providerRegistry: ProviderRegistry;
  readonly capabilityRegistry: CapabilityRegistry;
  readonly environmentBindingResolver: EnvironmentBindingResolver;
  readonly audit: ProviderExecutionAudit;
  readonly clock?: () => Date;
  readonly executionIdFactory?: (request: InfrastructureRequest) => string;
}

export class InfrastructureRegistry {
  readonly #providers: ProviderRegistry;
  readonly #capabilities: CapabilityRegistry;
  readonly #environments: EnvironmentBindingResolver;
  readonly #audit: ProviderExecutionAudit;
  readonly #emergencyAudit = new InMemoryProviderExecutionAudit();
  readonly #clock: () => Date;
  readonly #executionIdFactory: (request: InfrastructureRequest) => string;
  readonly #capabilityResolver: CapabilityResolver;
  readonly #providerResolver = new ProviderResolver();
  readonly #negotiator = new CapabilityNegotiator();
  readonly #integrity = new RegistryIntegrityValidator();
  #initialized = false;

  public constructor(options: InfrastructureRegistryOptions) {
    this.#providers = options.providerRegistry;
    this.#capabilities = options.capabilityRegistry;
    this.#environments = options.environmentBindingResolver;
    this.#audit = options.audit;
    this.#clock = options.clock ?? (() => new Date());
    this.#executionIdFactory =
      options.executionIdFactory ??
      ((request) => `${request.context.correlationId}:${this.#clock().getTime()}`);
    this.#capabilityResolver = new CapabilityResolver(this.#capabilities);
    this.#integrity.validate(this.#providers, this.#capabilities);
  }

  public async initialize(): Promise<void> {
    if (this.#initialized) return;
    const initialized: InfrastructureProvider[] = [];
    try {
      for (const provider of this.#providers.list()) {
        const environments = this.#environments
          .profiles()
          .filter((profile) => profile.availableProviders.includes(provider.id))
          .map((profile) => {
            const credentialSource = profile.credentialSources[provider.id];
            if (!credentialSource) {
              throw new InfrastructureError(
                "ENVIRONMENT_CONFIGURATION_INVALID",
                `Missing credential source for ${provider.id} in ${profile.environment}`,
                { providerId: provider.id, environment: profile.environment },
              );
            }
            return Object.freeze({
              environment: profile.environment,
              credentialSource,
            });
          });
        await provider.initialize({
          providerId: provider.id,
          environments: Object.freeze(environments),
        });
        initialized.push(provider);
      }
      this.#initialized = true;
    } catch (error) {
      await Promise.allSettled(initialized.map((provider) => provider.shutdown()));
      throw error;
    }
  }

  public async shutdown(): Promise<void> {
    await Promise.all(this.#providers.list().map((provider) => provider.shutdown()));
    this.#initialized = false;
  }

  public async health(): Promise<readonly Awaited<ReturnType<InfrastructureProvider["health"]>>[]> {
    return Object.freeze(
      await Promise.all(this.#providers.list().map((provider) => provider.health())),
    );
  }

  public resolve(request: InfrastructureRequest): CapabilityResolution {
    return this.#resolve(request, this.#executionIdFactory(request));
  }

  #resolve(
    request: InfrastructureRequest,
    executionId: string,
    onStage: (stage: InfrastructureExecutionStage) => void = () => undefined,
  ): CapabilityResolution {
    onStage("registry-integrity");
    this.#integrity.validate(this.#providers, this.#capabilities);
    onStage("capability-negotiation");
    const candidates = this.#capabilityResolver.resolve(request.capability);
    const negotiated = this.#negotiator.negotiate(candidates, request);
    onStage("environment-policy");
    const environment = this.#environments.resolve(request.context.environment, request.capability);
    const environmentEligible = this.#environments.applyCapabilityPolicy(environment, negotiated);
    onStage("provider-selection");
    const selected = this.#providerResolver.resolve(environmentEligible, environment);
    const provider = this.#providers.get(selected.providerId);
    const credentialSource = environment.credentialSources[selected.providerId];
    if (!credentialSource) {
      throw new InfrastructureError(
        "ENVIRONMENT_CONFIGURATION_INVALID",
        `Missing credential source for ${selected.providerId}`,
        {
          providerId: selected.providerId,
          environment: environment.environment,
        },
      );
    }
    const context: ProviderExecutionContext = Object.freeze({
      executionId,
      providerId: selected.providerId,
      capability: selected.capability.id,
      environment: environment.environment,
      credentialSource,
      startedAt: this.#clock().toISOString(),
    });
    return Object.freeze({
      provider,
      capability: selected.capability,
      environment,
      context,
    });
  }

  public async execute(request: InfrastructureRequest): Promise<InfrastructureResult> {
    const executionId = this.#executionIdFactory(request);
    let stage: InfrastructureExecutionStage = "registry-integrity";
    let providerId: string | undefined;
    try {
      const resolution = this.#resolve(request, executionId, (nextStage) => {
        stage = nextStage;
      });
      providerId = resolution.provider.id;
      stage = "permit-generation";
      const permit = issueProviderExecutionPermit(
        resolution.provider.id,
        request,
        resolution.context,
      );
      stage = "preflight";
      const validation = resolution.provider.validate(request, resolution.context);
      if (validation.accepted === false) {
        throw new InfrastructureError("PROVIDER_CAPABILITY_REJECTED", validation.reason, {
          providerId,
          capability: request.capability,
        });
      }
      stage = "preflight";
      const preflight = await resolution.provider.preflight(request, resolution.context);
      if (preflight.accepted === false) {
        throw new InfrastructureError("PROVIDER_CAPABILITY_REJECTED", preflight.reason, {
          providerId,
          capability: request.capability,
        });
      }
      stage = "execution";
      const result = await resolution.provider.execute(request, resolution.context, permit);
      stage = "postflight";
      const postflight = await resolution.provider.postflight(request, result, resolution.context);
      if (postflight.accepted === false) {
        throw new InfrastructureError("PROVIDER_POSTFLIGHT_REJECTED", postflight.reason, {
          providerId,
          capability: request.capability,
        });
      }
      stage = "audit";
      await this.#recordAudit(
        this.#auditEvent(request, executionId, providerId, "succeeded", stage),
      );
      stage = "response";
      return result;
    } catch (error) {
      const infrastructureError = error instanceof InfrastructureError ? error : undefined;
      await this.#recordAudit(
        this.#auditEvent(
          request,
          executionId,
          providerId,
          infrastructureError ? "rejected" : "failed",
          stage,
          infrastructureError?.code,
        ),
      );
      throw error;
    }
  }

  public emergencyAuditEvents(): readonly ProviderExecutionAuditEvent[] {
    return this.#emergencyAudit.events();
  }

  async #recordAudit(event: ProviderExecutionAuditEvent): Promise<void> {
    try {
      await this.#audit.record(event);
    } catch {
      // The provider outcome is already authoritative. Buffer the same immutable,
      // secret-free event so an audit transport outage cannot invite a replay.
      await this.#emergencyAudit.record(event);
    }
  }

  #auditEvent(
    request: InfrastructureRequest,
    executionId: string,
    providerId: string | undefined,
    outcome: ProviderExecutionAuditEvent["outcome"],
    stage: InfrastructureExecutionStage,
    errorCode?: string,
  ): ProviderExecutionAuditEvent {
    return Object.freeze({
      executionId,
      correlationId: request.context.correlationId,
      capability: request.capability,
      environment: request.context.environment,
      ...(providerId ? { providerId } : {}),
      outcome,
      stage,
      timestamp: this.#clock().toISOString(),
      ...(errorCode ? { errorCode } : {}),
    });
  }
}
