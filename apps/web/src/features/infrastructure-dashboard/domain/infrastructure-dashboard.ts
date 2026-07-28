export type DashboardHealthStatus = "healthy" | "degraded" | "unavailable";
export type CapabilityAvailability = "AVAILABLE" | "EXPERIMENTAL DISABLED" | "NOT SUPPORTED";

export interface InfrastructureDashboardModel {
  readonly generatedAt: string;
  readonly overview: {
    readonly providers: number;
    readonly healthyProviders: number;
    readonly environments: number;
    readonly supportedCapabilities: number;
  };
  readonly systemHealth: {
    readonly status: DashboardHealthStatus;
    readonly label: string;
    readonly detail: string;
  };
  readonly providers: readonly {
    readonly id: string;
    readonly name: string;
    readonly status: DashboardHealthStatus;
    readonly supportedCapabilities: number;
    readonly experimentalCapabilities: number;
    readonly unsupportedCapabilities: number;
  }[];
  readonly environments: readonly {
    readonly id: string;
    readonly providers: number;
    readonly allowedCapabilities: number;
    readonly bindings: number;
    readonly experimentalStatus: "DISABLED" | "ENABLED";
  }[];
  readonly capabilities: readonly {
    readonly providerId: string;
    readonly providerName: string;
    readonly id: string;
    readonly category: string;
    readonly access: string;
    readonly availability: CapabilityAvailability;
  }[];
  readonly activities: readonly {
    readonly id: string;
    readonly providerId: string;
    readonly capabilityId: string;
    readonly environment: string;
    readonly outcome: string;
    readonly stage: string;
    readonly occurredAt: string;
  }[];
  readonly alerts: readonly {
    readonly id: string;
    readonly code: "PROVIDER_DEGRADED" | "EXPERIMENTAL_DISABLED" | "CAPABILITY_NOT_SUPPORTED";
    readonly severity: "warning" | "info";
    readonly title: string;
    readonly detail: string;
  }[];
}
