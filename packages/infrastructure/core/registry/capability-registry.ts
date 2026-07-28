import type { InfrastructureProvider } from "../interfaces/infrastructure-provider";
import type { CapabilityCandidate, CapabilityDescriptor } from "../models/capability";
import { InfrastructureError } from "../models/error";

export interface CapabilityRegistration {
  readonly providerId: string;
  readonly capabilities: readonly CapabilityDescriptor[];
}

function frozenDescriptor(descriptor: CapabilityDescriptor): CapabilityDescriptor {
  return Object.freeze({
    ...descriptor,
    officialReferences: Object.freeze([...descriptor.officialReferences]),
    ...(descriptor.limitations ? { limitations: Object.freeze([...descriptor.limitations]) } : {}),
    ...(descriptor.requiredResourceTypes
      ? { requiredResourceTypes: Object.freeze([...descriptor.requiredResourceTypes]) }
      : {}),
  });
}

export class CapabilityRegistry {
  readonly #capabilities: ReadonlyMap<string, ReadonlyMap<string, CapabilityDescriptor>>;

  public constructor(providers: readonly InfrastructureProvider[] = []) {
    this.#capabilities = CapabilityRegistry.#build(
      providers.map((provider) => ({
        providerId: provider.id,
        capabilities: provider.capabilities(),
      })),
    );
    Object.freeze(this);
  }

  public static fromRegistrations(
    registrations: readonly CapabilityRegistration[],
  ): CapabilityRegistry {
    return new CapabilityRegistrySnapshot(registrations);
  }

  static #build(
    registrations: readonly CapabilityRegistration[],
  ): ReadonlyMap<string, ReadonlyMap<string, CapabilityDescriptor>> {
    const capabilities = new Map<string, Map<string, CapabilityDescriptor>>();
    for (const registration of registrations) {
      for (const original of registration.capabilities) {
        const capability = frozenDescriptor(original);
        let providers = capabilities.get(capability.id);
        if (!providers) {
          providers = new Map<string, CapabilityDescriptor>();
          capabilities.set(capability.id, providers);
        }
        if (providers.has(registration.providerId)) {
          throw new InfrastructureError(
            "PROVIDER_CAPABILITY_ALREADY_REGISTERED",
            `Capability ${capability.id} is already registered for provider ${registration.providerId}`,
            { capability: capability.id, providerId: registration.providerId },
          );
        }
        providers.set(registration.providerId, capability);
      }
    }
    return capabilities;
  }

  protected static build(
    registrations: readonly CapabilityRegistration[],
  ): ReadonlyMap<string, ReadonlyMap<string, CapabilityDescriptor>> {
    return CapabilityRegistry.#build(registrations);
  }

  public get(providerId: string, capabilityId: string): CapabilityDescriptor | undefined {
    return this.#capabilities.get(capabilityId)?.get(providerId);
  }

  public list(): readonly CapabilityCandidate[] {
    return Object.freeze(
      [...this.#capabilities.entries()]
        .flatMap(([_, providers]) =>
          [...providers.entries()].map(([providerId, capability]) =>
            Object.freeze({ providerId, capability }),
          ),
        )
        .sort((left, right) =>
          left.capability.id === right.capability.id
            ? left.providerId.localeCompare(right.providerId)
            : left.capability.id.localeCompare(right.capability.id),
        ),
    );
  }

  public candidates(capabilityId: string): readonly CapabilityCandidate[] {
    const providers = this.#capabilities.get(capabilityId);
    if (!providers) return Object.freeze([]);
    return Object.freeze(
      [...providers.entries()]
        .map(([providerId, capability]) => Object.freeze({ providerId, capability }))
        .sort((left, right) => left.providerId.localeCompare(right.providerId)),
    );
  }
}

class CapabilityRegistrySnapshot extends CapabilityRegistry {
  readonly #snapshot: ReadonlyMap<string, ReadonlyMap<string, CapabilityDescriptor>>;

  public constructor(registrations: readonly CapabilityRegistration[]) {
    super([]);
    this.#snapshot = CapabilityRegistry.build(registrations);
    Object.freeze(this);
  }

  public override get(providerId: string, capabilityId: string): CapabilityDescriptor | undefined {
    return this.#snapshot.get(capabilityId)?.get(providerId);
  }

  public override list(): readonly CapabilityCandidate[] {
    return Object.freeze(
      [...this.#snapshot.entries()]
        .flatMap(([_, providers]) =>
          [...providers.entries()].map(([providerId, capability]) =>
            Object.freeze({ providerId, capability }),
          ),
        )
        .sort((left, right) =>
          left.capability.id === right.capability.id
            ? left.providerId.localeCompare(right.providerId)
            : left.capability.id.localeCompare(right.capability.id),
        ),
    );
  }

  public override candidates(capabilityId: string): readonly CapabilityCandidate[] {
    const providers = this.#snapshot.get(capabilityId);
    if (!providers) return Object.freeze([]);
    return Object.freeze(
      [...providers.entries()]
        .map(([providerId, capability]) => Object.freeze({ providerId, capability }))
        .sort((left, right) => left.providerId.localeCompare(right.providerId)),
    );
  }
}
