import {
  CapabilityRegistry,
  EnvironmentBindingResolver,
  EnvironmentConfigurationValidator,
  InfrastructureRegistry,
  ProviderContractValidator,
  ProviderRegistry,
  RegistryIntegrityValidator,
  type EnvironmentConfiguration,
  type InfrastructureProvider,
  type ProviderExecutionAudit,
} from "../core/index";

export interface ProviderFactoryOptions {
  readonly providers: readonly InfrastructureProvider[];
  readonly environments: readonly EnvironmentConfiguration[];
  readonly audit: ProviderExecutionAudit;
  readonly clock?: () => Date;
  readonly executionIdFactory?: (request: import("../core/index").InfrastructureRequest) => string;
}

export class ProviderFactory {
  public async bootstrap(options: ProviderFactoryOptions): Promise<InfrastructureRegistry> {
    const contractValidator = new ProviderContractValidator();
    for (const provider of options.providers) contractValidator.validate(provider);

    const providerRegistry = new ProviderRegistry(options.providers);
    const capabilityRegistry = new CapabilityRegistry(options.providers);
    const environmentBindingResolver = new EnvironmentBindingResolver(options.environments);
    new EnvironmentConfigurationValidator().validate(
      providerRegistry,
      capabilityRegistry,
      environmentBindingResolver,
    );
    new RegistryIntegrityValidator().validate(providerRegistry, capabilityRegistry);

    const registry = new InfrastructureRegistry({
      providerRegistry,
      capabilityRegistry,
      environmentBindingResolver,
      audit: options.audit,
      ...(options.clock ? { clock: options.clock } : {}),
      ...(options.executionIdFactory ? { executionIdFactory: options.executionIdFactory } : {}),
    });
    await registry.initialize();
    return registry;
  }
}
