import type { ProviderCenterRepository } from "../ports/provider-center-repository";
import type {
  ProviderCenterCapabilityModel,
  ProviderCenterHealth,
  ProviderCenterModel,
} from "../../domain/provider-center";

function healthLabel(status: string): ProviderCenterHealth {
  if (status === "healthy") return "HEALTHY";
  if (status === "degraded") return "DEGRADED";
  return "UNAVAILABLE";
}

function capabilityModel(
  capability: Awaited<ReturnType<ProviderCenterRepository["loadSnapshot"]>>["capabilities"][number],
): ProviderCenterCapabilityModel | null {
  if (capability.status === "supported" || capability.status === "partial") {
    return Object.freeze({
      id: capability.id,
      category: capability.category,
      plane: capability.plane,
      access: capability.access,
      availability: capability.status === "supported" ? "SUPPORTED" : "PARTIAL",
    });
  }
  if (capability.status === "experimental") {
    return Object.freeze({
      id: capability.id,
      category: capability.category,
      plane: capability.plane,
      access: capability.access,
      availability: "EXPERIMENTAL DISABLED",
    });
  }
  return null;
}

/** Projects Provider Registry and Capability Registry snapshots into a secret-free read model. */
export async function getProviderCenter(
  repository: ProviderCenterRepository,
): Promise<ProviderCenterModel> {
  const snapshot = await repository.loadSnapshot();
  const projected = snapshot.providers
    .map((provider) => {
      const capabilities = snapshot.capabilities
        .filter((candidate) => candidate.providerId === provider.id)
        .map(capabilityModel)
        .filter((item): item is ProviderCenterCapabilityModel => item !== null)
        .sort((left, right) => left.id.localeCompare(right.id));
      return Object.freeze({
        id: provider.id,
        displayName: provider.displayName,
        version: provider.version ?? "NOT PUBLISHED",
        health: healthLabel(provider.health),
        connectionStatus: provider.registered ? "REGISTERED" : "NOT REGISTERED",
        supportedCapabilities: Object.freeze(
          capabilities.filter((item) => item.availability !== "EXPERIMENTAL DISABLED"),
        ),
        experimentalFeatures: Object.freeze(
          capabilities.filter((item) => item.availability === "EXPERIMENTAL DISABLED"),
        ),
      });
    })
    .sort((left, right) => left.id.localeCompare(right.id));

  return Object.freeze({
    generatedAt: snapshot.generatedAt,
    summary: Object.freeze({
      providers: projected.length,
      healthyProviders: projected.filter((provider) => provider.health === "HEALTHY").length,
      supportedCapabilities: projected.reduce(
        (total, provider) => total + provider.supportedCapabilities.length,
        0,
      ),
      experimentalCapabilities: projected.reduce(
        (total, provider) => total + provider.experimentalFeatures.length,
        0,
      ),
    }),
    providers: Object.freeze(projected),
  });
}
