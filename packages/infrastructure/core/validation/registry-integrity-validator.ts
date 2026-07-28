import type { CapabilityCandidate, CapabilityDescriptor } from "../models/capability";
import { InfrastructureError } from "../models/error";
import type { CapabilityRegistry } from "../registry/capability-registry";
import type { ProviderRegistry } from "../registry/provider-registry";
import { ProviderContractValidator } from "./provider-contract-validator";

function descriptorFingerprint(descriptor: CapabilityDescriptor): string {
  return JSON.stringify({
    id: descriptor.id,
    category: descriptor.category,
    plane: descriptor.plane,
    status: descriptor.status,
    access: descriptor.access,
    officialReferences: [...descriptor.officialReferences],
    limitations: descriptor.limitations ? [...descriptor.limitations] : [],
    requiredResourceTypes: descriptor.requiredResourceTypes
      ? [...descriptor.requiredResourceTypes]
      : [],
  });
}

export class RegistryIntegrityValidator {
  public validate(providers: ProviderRegistry, capabilities: CapabilityRegistry): void {
    const contractValidator = new ProviderContractValidator();
    for (const provider of providers.list()) {
      contractValidator.validate(provider);
      for (const descriptor of provider.capabilities()) {
        const registryDescriptor = capabilities.get(provider.id, descriptor.id);
        if (
          !registryDescriptor ||
          descriptorFingerprint(registryDescriptor) !== descriptorFingerprint(descriptor)
        ) {
          this.#violation(provider.id, descriptor.id);
        }
      }
    }
    for (const candidate of capabilities.list()) {
      this.#validateCandidate(providers, candidate);
    }
  }

  #validateCandidate(providers: ProviderRegistry, candidate: CapabilityCandidate): void {
    let provider;
    try {
      provider = providers.get(candidate.providerId);
    } catch {
      this.#violation(candidate.providerId, candidate.capability.id);
    }
    const providerDescriptor = provider
      ?.capabilities()
      .find((descriptor) => descriptor.id === candidate.capability.id);
    if (
      !providerDescriptor ||
      descriptorFingerprint(providerDescriptor) !== descriptorFingerprint(candidate.capability)
    ) {
      this.#violation(candidate.providerId, candidate.capability.id);
    }
  }

  #violation(providerId: string, capabilityId: string): never {
    throw new InfrastructureError(
      "REGISTRY_INTEGRITY_VIOLATION",
      `Capability registry does not match provider ${providerId}`,
      { providerId, capability: capabilityId },
    );
  }
}
