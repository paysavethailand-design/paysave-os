import { describe, expect, it } from "vitest";
import {
  EnvironmentBindingResolver,
  InfrastructureError,
  ProviderResolver,
  type CapabilityCandidate,
  type CapabilityDescriptor,
  type EnvironmentConfiguration,
} from "../core/index";
import { createDefaultEnvironmentConfigurations } from "../environment/default-environments";

const descriptor: CapabilityDescriptor = Object.freeze({
  id: "dns.record.read",
  category: "dns",
  plane: "control",
  status: "supported",
  access: "read",
  officialReferences: Object.freeze(["https://developers.hostinger.com/openapi/openapi.json"]),
});

const candidates: readonly CapabilityCandidate[] = Object.freeze([
  Object.freeze({ providerId: "cloudflare", capability: descriptor }),
  Object.freeze({ providerId: "hostinger", capability: descriptor }),
]);

const environments: readonly EnvironmentConfiguration[] = [
  {
    environment: "development",
    availableProviders: ["hostinger"],
    allowedCapabilities: [descriptor.id],
    experimentalCapabilities: [],
    bindings: { [descriptor.id]: "hostinger" },
    credentialSources: {
      hostinger: { kind: "environment", reference: "HOSTINGER_API_TOKEN" },
    },
  },
  {
    environment: "internal-beta",
    availableProviders: ["hostinger"],
    allowedCapabilities: [descriptor.id],
    experimentalCapabilities: [],
    bindings: { [descriptor.id]: "hostinger" },
    credentialSources: {
      hostinger: {
        kind: "secret-manager",
        reference: "projects/paysave-internal/secrets/hostinger-api-token",
      },
    },
  },
  {
    environment: "staging",
    availableProviders: ["hostinger"],
    allowedCapabilities: [descriptor.id],
    experimentalCapabilities: [],
    bindings: { [descriptor.id]: "hostinger" },
    credentialSources: {
      hostinger: {
        kind: "secret-manager",
        reference: "projects/paysave-staging/secrets/hostinger-api-token",
      },
    },
  },
  {
    environment: "production",
    availableProviders: ["hostinger"],
    allowedCapabilities: [descriptor.id],
    experimentalCapabilities: [],
    bindings: { [descriptor.id]: "hostinger" },
    credentialSources: {
      hostinger: {
        kind: "workload-identity",
        reference: "paysave-production-infrastructure",
      },
    },
  },
];

describe("environment and provider resolution", () => {
  it("defines four trusted default profiles with experimental operations disabled", () => {
    const defaults = createDefaultEnvironmentConfigurations();

    expect(defaults.map((profile) => profile.environment)).toEqual([
      "development",
      "internal-beta",
      "staging",
      "production",
    ]);
    expect(defaults.every((profile) => profile.availableProviders.length === 3)).toBe(true);
    expect(defaults.every((profile) => profile.allowedCapabilities.length > 0)).toBe(true);
    expect(defaults.every((profile) => profile.experimentalCapabilities.length === 0)).toBe(true);
    expect(
      defaults.every(
        (profile) =>
          Object.keys(profile.credentialSources).length === 3 &&
          Object.values(profile.credentialSources).every((source) => source.reference.length > 0),
      ),
    ).toBe(true);
    expect(Object.isFrozen(defaults)).toBe(true);
  });

  it("requires all four immutable environment profiles", () => {
    const resolver = new EnvironmentBindingResolver(environments);

    for (const environment of ["development", "internal-beta", "staging", "production"] as const) {
      const profile = resolver.profile(environment);
      expect(profile.environment).toBe(environment);
      expect(Object.isFrozen(profile)).toBe(true);
      expect(Object.isFrozen(profile.availableProviders)).toBe(true);
    }
  });

  it("fails bootstrap when an environment profile is missing", () => {
    expect(() => new EnvironmentBindingResolver(environments.slice(0, 3))).toThrowError(
      expect.objectContaining({ code: "ENVIRONMENT_CONFIGURATION_INVALID" }) as InfrastructureError,
    );
  });

  it("rejects duplicate profiles and unknown runtime environments", () => {
    expect(() => new EnvironmentBindingResolver([...environments, environments[0]!])).toThrowError(
      expect.objectContaining({ code: "ENVIRONMENT_CONFIGURATION_INVALID" }) as InfrastructureError,
    );

    const resolver = new EnvironmentBindingResolver(environments);
    expect(() => resolver.profile("unknown" as never)).toThrowError(
      expect.objectContaining({ code: "ENVIRONMENT_CONFIGURATION_INVALID" }) as InfrastructureError,
    );
  });

  it("resolves deterministic trusted binding and credential reference", () => {
    const environment = new EnvironmentBindingResolver(environments);
    const policy = environment.resolve("internal-beta", descriptor.id);
    const selected = new ProviderResolver().resolve(candidates, policy);

    expect(selected.providerId).toBe("hostinger");
    expect(policy.credentialSources.hostinger).toEqual({
      kind: "secret-manager",
      reference: "projects/paysave-internal/secrets/hostinger-api-token",
    });
  });

  it("rejects capabilities not allowed by the environment", () => {
    const resolver = new EnvironmentBindingResolver(environments);

    expect(() => resolver.resolve("production", "release.write")).toThrowError(
      expect.objectContaining({
        code: "CAPABILITY_NOT_ALLOWED_IN_ENVIRONMENT",
      }) as InfrastructureError,
    );
  });

  it("rejects unavailable and ambiguous provider resolution", () => {
    const resolver = new ProviderResolver();
    const profile = new EnvironmentBindingResolver(environments).resolve("staging", descriptor.id);

    expect(() =>
      resolver.resolve(
        Object.freeze([Object.freeze({ providerId: "cloudflare", capability: descriptor })]),
        profile,
      ),
    ).toThrowError(expect.objectContaining({ code: "NOT_SUPPORTED" }) as InfrastructureError);

    const unavailable = {
      ...profile,
      bindings: Object.freeze({ [descriptor.id]: "cloudflare" }),
    };
    expect(() => resolver.resolve(candidates, unavailable)).toThrowError(
      expect.objectContaining({
        code: "PROVIDER_NOT_AVAILABLE_IN_ENVIRONMENT",
      }) as InfrastructureError,
    );

    const unbound = {
      ...profile,
      bindings: Object.freeze({}),
      availableProviders: Object.freeze(["cloudflare", "hostinger"]),
    };
    expect(() => resolver.resolve(candidates, unbound)).toThrowError(
      expect.objectContaining({ code: "AMBIGUOUS_PROVIDER_RESOLUTION" }) as InfrastructureError,
    );
  });
});
