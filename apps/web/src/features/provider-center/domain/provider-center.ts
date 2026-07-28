export type ProviderCenterHealth = "HEALTHY" | "DEGRADED" | "UNAVAILABLE";
export type ProviderCenterConnection = "REGISTERED" | "NOT REGISTERED";

export interface ProviderCenterCapabilityModel {
  readonly id: string;
  readonly category: string;
  readonly plane: string;
  readonly access: string;
  readonly availability: "SUPPORTED" | "PARTIAL" | "EXPERIMENTAL DISABLED";
}

export interface ProviderCenterProviderModel {
  readonly id: string;
  readonly displayName: string;
  readonly version: string;
  readonly health: ProviderCenterHealth;
  readonly connectionStatus: ProviderCenterConnection;
  readonly supportedCapabilities: readonly ProviderCenterCapabilityModel[];
  readonly experimentalFeatures: readonly ProviderCenterCapabilityModel[];
}

export interface ProviderCenterModel {
  readonly generatedAt: string;
  readonly summary: {
    readonly providers: number;
    readonly healthyProviders: number;
    readonly supportedCapabilities: number;
    readonly experimentalCapabilities: number;
  };
  readonly providers: readonly ProviderCenterProviderModel[];
}
