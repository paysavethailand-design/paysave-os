export type MonitoringHealthStatus = "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "UNKNOWN";
export type MonitoringProviderStatus = MonitoringHealthStatus | "UNCONFIRMED";
export type MonitoringEventSeverity = "INFO" | "WARNING" | "ERROR";

export interface MonitoringCenterModel {
  readonly generatedAt: string;
  readonly infrastructureHealth: {
    readonly status: MonitoringHealthStatus;
    readonly label: string;
    readonly detail: string;
  };
  readonly providerHealth: readonly {
    readonly id: string;
    readonly status: MonitoringProviderStatus;
    readonly detail: string;
  }[];
  readonly registryHealth: {
    readonly status: MonitoringHealthStatus;
    readonly providers: number;
    readonly capabilities: number;
    readonly detail: string;
  };
  readonly environmentStatus: readonly {
    readonly id: string;
    readonly status: "CONFIGURED" | "UNKNOWN";
    readonly providers: number;
    readonly capabilities: number;
    readonly bindings: number;
    readonly experimental: "ENABLED" | "DISABLED";
  }[];
  readonly recentEvents: readonly {
    readonly id: string;
    readonly occurredAt: string;
    readonly severity: MonitoringEventSeverity;
    readonly source: string;
    readonly title: string;
    readonly detail: string;
  }[];
  readonly systemMetrics: readonly {
    readonly id: string;
    readonly label: string;
    readonly value: string;
    readonly kind: "COUNTER" | "GAUGE";
    readonly description: string;
  }[];
  readonly alerts: readonly {
    readonly id: string;
    readonly code: string;
    readonly severity: MonitoringEventSeverity;
    readonly title: string;
    readonly detail: string;
  }[];
}
