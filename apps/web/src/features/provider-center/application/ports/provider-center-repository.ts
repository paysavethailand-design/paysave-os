export type ProviderCenterCapabilityStatus =
  | "supported"
  | "partial"
  | "experimental"
  | "unconfirmed"
  | "unsupported"
  | "not_entitled"
  | "unavailable"
  | "deprecated";

export interface ProviderCenterRegistrySnapshot {
  readonly generatedAt: string;
  readonly providers: readonly {
    readonly id: string;
    readonly displayName: string;
    readonly version: string | null;
    readonly health: string;
    readonly registered: boolean;
  }[];
  readonly capabilities: readonly {
    readonly providerId: string;
    readonly id: string;
    readonly category: string;
    readonly plane: string;
    readonly access: string;
    readonly status: ProviderCenterCapabilityStatus;
  }[];
}

/** Read-only Application Layer port. Its snapshot deliberately excludes credential material. */
export interface ProviderCenterRepository {
  loadSnapshot(): Promise<ProviderCenterRegistrySnapshot>;
}
