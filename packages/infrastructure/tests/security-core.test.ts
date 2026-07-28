import { describe, expect, it } from "vitest";
import {
  CapabilityNegotiator,
  CapabilityRegistry,
  EnvironmentBindingResolver,
  InfrastructureError,
  ProviderRegistry,
  RegistryIntegrityValidator,
  type CapabilityDescriptor,
  type EnvironmentConfiguration,
  type InfrastructureRequest,
  type ProviderExecutionContext,
} from "../core/index";
import {
  consumeProviderExecutionPermit,
  issueProviderExecutionPermit,
} from "../core/providers/execution-permit";
import { MockInfrastructureProvider } from "../shared/testing";

function capability(status: CapabilityDescriptor["status"] = "supported"): CapabilityDescriptor {
  return Object.freeze({
    id: "deployment.docker-compose.execute",
    category: "deployment",
    plane: "control",
    status,
    access: "write",
    officialReferences: Object.freeze(["https://developers.hostinger.com/openapi/openapi.json"]),
  });
}

const request: InfrastructureRequest = {
  capability: "deployment.docker-compose.execute",
  payload: undefined,
  context: {
    environment: "internal-beta",
    tenantId: "tenant",
    actorId: "actor",
    correlationId: "security-core",
  },
};

const executionContext: ProviderExecutionContext = {
  executionId: "execution-1",
  providerId: "hostinger",
  capability: request.capability,
  environment: "internal-beta",
  credentialSource: {
    kind: "secret-manager",
    reference: "projects/paysave-internal/secrets/hostinger-api-token",
  },
  startedAt: "2026-07-26T10:00:00.000Z",
};

const environment: EnvironmentConfiguration = Object.freeze({
  environment: "internal-beta",
  availableProviders: Object.freeze(["hostinger"]),
  allowedCapabilities: Object.freeze([request.capability]),
  experimentalCapabilities: Object.freeze([]),
  bindings: Object.freeze({ [request.capability]: "hostinger" }),
  credentialSources: Object.freeze({
    hostinger: Object.freeze({
      kind: "secret-manager" as const,
      reference: "projects/paysave-internal/secrets/hostinger-api-token",
    }),
  }),
});

describe("registry integrity and capability security", () => {
  it("validates complete descriptor parity", () => {
    const provider = new MockInfrastructureProvider("hostinger", [capability()]);
    const providers = new ProviderRegistry([provider]);
    const capabilities = new CapabilityRegistry([provider]);

    expect(() => new RegistryIntegrityValidator().validate(providers, capabilities)).not.toThrow();
  });

  it("rejects registry drift before execution", () => {
    const provider = new MockInfrastructureProvider("hostinger", [capability("experimental")]);
    const providers = new ProviderRegistry([provider]);
    const drifted = CapabilityRegistry.fromRegistrations([
      { providerId: "hostinger", capabilities: [capability("supported")] },
    ]);

    expect(() => new RegistryIntegrityValidator().validate(providers, drifted)).toThrowError(
      expect.objectContaining({ code: "REGISTRY_INTEGRITY_VIOLATION" }) as InfrastructureError,
    );
    expect(provider.executionCount).toBe(0);
  });

  it("rejects registry entries for missing providers and missing provider capabilities", () => {
    const provider = new MockInfrastructureProvider("hostinger", [capability()]);
    const providers = new ProviderRegistry([provider]);
    const phantomProviderRegistry = CapabilityRegistry.fromRegistrations([
      { providerId: "hostinger", capabilities: [capability()] },
      { providerId: "phantom", capabilities: [capability()] },
    ]);
    expect(() =>
      new RegistryIntegrityValidator().validate(providers, phantomProviderRegistry),
    ).toThrowError(
      expect.objectContaining({ code: "REGISTRY_INTEGRITY_VIOLATION" }) as InfrastructureError,
    );

    const extraCapability = Object.freeze({
      ...capability(),
      id: "dns.record.read",
    });
    const phantomCapabilityRegistry = CapabilityRegistry.fromRegistrations([
      {
        providerId: "hostinger",
        capabilities: [capability(), extraCapability],
      },
    ]);
    expect(() =>
      new RegistryIntegrityValidator().validate(providers, phantomCapabilityRegistry),
    ).toThrowError(
      expect.objectContaining({ code: "REGISTRY_INTEGRITY_VIOLATION" }) as InfrastructureError,
    );
  });

  it("returns NOT_SUPPORTED for declared unsupported capability", () => {
    expect(() =>
      new CapabilityNegotiator().negotiate(
        [{ providerId: "hostinger", capability: capability("unsupported") }],
        request,
      ),
    ).toThrowError(expect.objectContaining({ code: "NOT_SUPPORTED" }) as InfrastructureError);
  });

  it("keeps experimental capability disabled without both environment and request opt-in", () => {
    const candidate = {
      providerId: "hostinger",
      capability: capability("experimental"),
    };
    const negotiator = new CapabilityNegotiator();

    expect(() => negotiator.negotiate([candidate], request)).toThrowError(
      expect.objectContaining({ code: "EXPERIMENTAL_CAPABILITY_DISABLED" }) as InfrastructureError,
    );
    const negotiated = negotiator.negotiate([candidate], { ...request, allowExperimental: true });
    const enabledEnvironment = {
      ...environment,
      experimentalCapabilities: Object.freeze([request.capability]),
    };
    const resolver = new EnvironmentBindingResolver(
      (["development", "internal-beta", "staging", "production"] as const).map(
        (environmentName) => ({ ...environment, environment: environmentName }),
      ),
    );
    expect(() => resolver.applyCapabilityPolicy(environment, negotiated)).toThrowError(
      expect.objectContaining({ code: "EXPERIMENTAL_CAPABILITY_DISABLED" }) as InfrastructureError,
    );
    expect(resolver.applyCapabilityPolicy(enabledEnvironment, negotiated)).toEqual([candidate]);
    expect(resolver.applyCapabilityPolicy(environment, [])).toEqual([]);
  });

  it("uses a context-bound one-time permit", () => {
    const permit = issueProviderExecutionPermit("hostinger", request, executionContext);

    expect(consumeProviderExecutionPermit(permit, "hostinger", request, executionContext)).toBe(
      true,
    );
    expect(consumeProviderExecutionPermit(permit, "hostinger", request, executionContext)).toBe(
      false,
    );
    const anotherPermit = issueProviderExecutionPermit("hostinger", request, executionContext);
    expect(
      consumeProviderExecutionPermit(anotherPermit, "hostinger", request, {
        ...executionContext,
        executionId: "forged",
      }),
    ).toBe(false);
  });
});
