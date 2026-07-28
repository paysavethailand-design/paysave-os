export type InfrastructureOperationDomainId =
  "domain" | "dns" | "hosting" | "database" | "authentication" | "storage" | "environment";

export type InfrastructureOperationAvailability =
  "SUPPORTED" | "PARTIAL" | "NOT SUPPORTED" | "EXPERIMENTAL";

export interface InfrastructureOperationProviderModel {
  readonly providerId: string;
  readonly availability: InfrastructureOperationAvailability;
  readonly plane: string | null;
  readonly access: string | null;
}

export interface InfrastructureOperationCapabilityModel {
  readonly id: string;
  readonly category: string;
  readonly providers: readonly InfrastructureOperationProviderModel[];
}

export interface InfrastructureOperationDomainModel {
  readonly id: InfrastructureOperationDomainId;
  readonly label: string;
  readonly description: string;
  readonly capabilities: readonly InfrastructureOperationCapabilityModel[];
  readonly counts: Readonly<Record<InfrastructureOperationAvailability, number>>;
}

export interface InfrastructureOperationsModel {
  readonly generatedAt: string;
  readonly providers: readonly string[];
  readonly summary: {
    readonly domains: number;
    readonly providers: number;
    readonly publishedCapabilities: number;
    readonly supportedCells: number;
    readonly partialCells: number;
    readonly unsupportedCells: number;
    readonly experimentalCells: number;
  };
  readonly domains: readonly InfrastructureOperationDomainModel[];
}
