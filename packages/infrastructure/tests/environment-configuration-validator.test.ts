import { describe, expect, it, vi } from "vitest";
import {
  CapabilityRegistry,
  EnvironmentBindingResolver,
  EnvironmentConfigurationValidator,
  InfrastructureError,
  ProviderRegistry,
  type EnvironmentConfiguration,
} from "../core/index";
import { createDefaultEnvironmentConfigurations } from "../environment/default-environments";
import {
  createGitHubProvider,
  createHostingerProvider,
  createSupabaseProvider,
  type ProviderExecutor,
} from "../server";

const executor: ProviderExecutor = {
  execute: vi.fn(async () => {
    throw new Error("Configuration validation must not execute providers");
  }),
};

function registries() {
  const providers = new ProviderRegistry([
    createGitHubProvider(executor),
    createHostingerProvider(executor),
    createSupabaseProvider(executor),
  ]);
  return {
    providers,
    capabilities: new CapabilityRegistry(providers.list()),
  };
}

function validate(configurations: readonly EnvironmentConfiguration[]): void {
  const { providers, capabilities } = registries();
  new EnvironmentConfigurationValidator().validate(
    providers,
    capabilities,
    new EnvironmentBindingResolver(configurations),
  );
}

function mutateFirst(
  change: (configuration: EnvironmentConfiguration) => EnvironmentConfiguration,
): readonly EnvironmentConfiguration[] {
  const configurations = createDefaultEnvironmentConfigurations();
  return [change(configurations[0]!), ...configurations.slice(1)];
}

describe("EnvironmentConfigurationValidator", () => {
  it("validates all default bindings without initializing or executing providers", () => {
    expect(() => validate(createDefaultEnvironmentConfigurations())).not.toThrow();
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it("rejects an available provider without a credential-source reference", () => {
    const configurations = mutateFirst((configuration) => ({
      ...configuration,
      credentialSources: {},
    }));

    expect(() => validate(configurations)).toThrowError(
      expect.objectContaining<Partial<InfrastructureError>>({
        code: "ENVIRONMENT_CONFIGURATION_INVALID",
      }),
    );
  });

  it("rejects a binding that is not supported by the selected provider", () => {
    const configurations = mutateFirst((configuration) => ({
      ...configuration,
      bindings: {
        ...configuration.bindings,
        "dns.record.read": "github",
      },
    }));

    expect(() => validate(configurations)).toThrowError(
      expect.objectContaining<Partial<InfrastructureError>>({
        code: "ENVIRONMENT_CONFIGURATION_INVALID",
      }),
    );
  });

  it("rejects an experimental policy that references a supported capability", () => {
    const configurations = mutateFirst((configuration) => ({
      ...configuration,
      experimentalCapabilities: ["dns.record.read"],
    }));

    expect(() => validate(configurations)).toThrowError(
      expect.objectContaining<Partial<InfrastructureError>>({
        code: "ENVIRONMENT_CONFIGURATION_INVALID",
      }),
    );
  });
});
