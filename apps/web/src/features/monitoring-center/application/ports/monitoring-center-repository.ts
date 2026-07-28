export type MonitoringProviderHealth = "healthy" | "degraded" | "unhealthy" | "unconfirmed";

export interface MonitoringCenterSnapshot {
  readonly generatedAt: string;
  readonly registry: {
    readonly integrity: "valid" | "invalid";
    readonly providerCount: number;
    readonly capabilityCount: number;
  };
  readonly providers: readonly {
    readonly id: string;
    readonly monitoringHealth: MonitoringProviderHealth;
  }[];
  readonly environments: readonly {
    readonly id: string;
    readonly providerCount: number;
    readonly capabilityCount: number;
    readonly bindingCount: number;
    readonly experimentalEnabled: boolean;
  }[];
  readonly metrics: {
    readonly healthzRequests: number;
    readonly readyzRequests: number;
    readonly versionRequests: number;
    readonly metricsRequests: number;
    readonly unhandledRouteErrors: number;
    readonly readinessStatus: 0 | 1;
  };
  readonly events: readonly {
    readonly id: string;
    readonly occurredAt: string;
    readonly severity: "info" | "warning" | "error";
    readonly source: string;
    readonly title: string;
    readonly detail: string;
  }[];
}

/** Application Layer port for secret-free Registry and Monitoring read-model snapshots. */
export interface MonitoringCenterRepository {
  loadSnapshot(): Promise<MonitoringCenterSnapshot>;
}
