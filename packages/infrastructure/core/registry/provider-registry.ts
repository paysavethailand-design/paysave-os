import type { InfrastructureProvider } from "../interfaces/infrastructure-provider";
import { InfrastructureError } from "../models/error";

export class ProviderRegistry {
  readonly #providers: ReadonlyMap<string, InfrastructureProvider>;
  readonly #list: readonly InfrastructureProvider[];

  public constructor(providers: readonly InfrastructureProvider[] = []) {
    const registered = new Map<string, InfrastructureProvider>();
    for (const provider of providers) {
      if (registered.has(provider.id)) {
        throw new InfrastructureError(
          "PROVIDER_ALREADY_REGISTERED",
          `Provider ${provider.id} is already registered`,
          { providerId: provider.id },
        );
      }
      registered.set(provider.id, provider);
    }
    this.#providers = registered;
    this.#list = Object.freeze(
      [...registered.values()].sort((left, right) => left.id.localeCompare(right.id)),
    );
    Object.freeze(this);
  }

  public get(providerId: string): InfrastructureProvider {
    const provider = this.#providers.get(providerId);
    if (!provider) {
      throw new InfrastructureError(
        "PROVIDER_NOT_REGISTERED",
        `Provider ${providerId} is not registered`,
        { providerId },
      );
    }
    return provider;
  }

  public list(): readonly InfrastructureProvider[] {
    return this.#list;
  }
}
