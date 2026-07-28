export type InfrastructureProviderHealth = "healthy" | "degraded" | "unhealthy" | "stopped";
export type InfrastructureCapabilityStatus =
  | "supported"
  | "partial"
  | "experimental"
  | "unconfirmed"
  | "unsupported"
  | "not_entitled"
  | "unavailable"
  | "deprecated";

export interface InfrastructureCapabilitySnapshot {
  readonly id: string;
  readonly category: string;
  readonly access: "read" | "write" | "destructive" | "purchase";
  readonly status: InfrastructureCapabilityStatus;
}

export interface InfrastructureProviderSnapshot {
  readonly id: string;
  readonly displayName: string;
  readonly health: InfrastructureProviderHealth;
  readonly capabilities: readonly InfrastructureCapabilitySnapshot[];
}

export interface InfrastructureEnvironmentSnapshot {
  readonly id: "development" | "internal-beta" | "staging" | "production";
  readonly providerIds: readonly string[];
  readonly allowedCapabilityCount: number;
  readonly bindingCount: number;
  readonly experimentalEnabled: boolean;
}

export interface InfrastructureActivitySnapshot {
  readonly id: string;
  readonly providerId?: string;
  readonly capabilityId: string;
  readonly environment: string;
  readonly outcome: "succeeded" | "rejected" | "failed";
  readonly stage: string;
  readonly occurredAt: string;
}

export interface InfrastructureDashboardSnapshot {
  readonly generatedAt: string;
  readonly providers: readonly InfrastructureProviderSnapshot[];
  readonly environments: readonly InfrastructureEnvironmentSnapshot[];
  readonly activities: readonly InfrastructureActivitySnapshot[];
}

/** Read-only port consumed by the Application Layer; credential material is deliberately absent. */
export interface InfrastructureDashboardRepository {
  loadSnapshot(): Promise<InfrastructureDashboardSnapshot>;
}
