export type CapabilityAvailability = "SUPPORTED" | "PARTIAL" | "NOT SUPPORTED" | "EXPERIMENTAL";

export interface CapabilityProviderModel {
  readonly providerId: string;
  readonly availability: CapabilityAvailability;
  readonly plane: string | null;
  readonly access: string | null;
}

export interface CapabilityExplorerItemModel {
  readonly id: string;
  readonly category: string;
  readonly providers: readonly CapabilityProviderModel[];
  readonly counts: Readonly<Record<CapabilityAvailability, number>>;
}

export interface CapabilityExplorerModel {
  readonly generatedAt: string;
  readonly summary: {
    readonly capabilities: number;
    readonly categories: number;
    readonly providers: number;
    readonly supportedCells: number;
    readonly partialCells: number;
    readonly unsupportedCells: number;
    readonly experimentalCells: number;
  };
  readonly categories: readonly {
    readonly name: string;
    readonly capabilities: number;
  }[];
  readonly providers: readonly string[];
  readonly capabilities: readonly CapabilityExplorerItemModel[];
}
