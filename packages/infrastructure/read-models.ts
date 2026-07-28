import type { CapabilityDescriptor } from "./core/index";
import { GITHUB_CAPABILITIES } from "./github/index";
import { HOSTINGER_CAPABILITIES } from "./hostinger/index";
import { SUPABASE_CAPABILITIES } from "./supabase/index";

export interface InfrastructureCapabilityReadModel {
  readonly id: CapabilityDescriptor["id"];
  readonly plane: CapabilityDescriptor["plane"];
  readonly category: string;
  readonly status: CapabilityDescriptor["status"];
  readonly access: CapabilityDescriptor["access"];
}

export interface InfrastructureProviderManifestReadModel {
  readonly id: "github" | "hostinger" | "supabase";
  readonly displayName: string;
  readonly capabilities: readonly InfrastructureCapabilityReadModel[];
}

export interface InfrastructureEnvironmentSummaryReadModel {
  readonly id: "development" | "internal-beta" | "production" | "staging";
  readonly providerIds: readonly string[];
  readonly allowedCapabilityCount: number;
  readonly bindingCount: number;
  readonly experimentalEnabled: boolean;
}

function capabilities(items: readonly CapabilityDescriptor[]) {
  return Object.freeze(
    items.map((item) =>
      Object.freeze({
        id: item.id,
        plane: item.plane,
        category: item.category,
        status: item.status,
        access: item.access,
      }),
    ),
  );
}

export const INFRASTRUCTURE_PROVIDER_MANIFESTS: readonly InfrastructureProviderManifestReadModel[] =
  Object.freeze([
    Object.freeze({
      id: "github",
      displayName: "GitHub",
      capabilities: capabilities(GITHUB_CAPABILITIES),
    }),
    Object.freeze({
      id: "hostinger",
      displayName: "Hostinger",
      capabilities: capabilities(HOSTINGER_CAPABILITIES),
    }),
    Object.freeze({
      id: "supabase",
      displayName: "Supabase",
      capabilities: capabilities(SUPABASE_CAPABILITIES),
    }),
  ]);

const providerIds = Object.freeze(INFRASTRUCTURE_PROVIDER_MANIFESTS.map((provider) => provider.id));
const allowedCapabilityCount = new Set(
  INFRASTRUCTURE_PROVIDER_MANIFESTS.flatMap((provider) =>
    provider.capabilities
      .filter((capability) => capability.status === "supported" || capability.status === "partial")
      .map((capability) => capability.id),
  ),
).size;

export const INFRASTRUCTURE_ENVIRONMENT_SUMMARIES: readonly InfrastructureEnvironmentSummaryReadModel[] =
  Object.freeze(
    (["development", "internal-beta", "production", "staging"] as const).map((id) =>
      Object.freeze({
        id,
        providerIds,
        allowedCapabilityCount,
        bindingCount: allowedCapabilityCount,
        experimentalEnabled: false,
      }),
    ),
  );
