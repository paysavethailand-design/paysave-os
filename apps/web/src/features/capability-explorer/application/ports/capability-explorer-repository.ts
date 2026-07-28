export type CapabilityRegistryStatus =
  | "supported"
  | "partial"
  | "experimental"
  | "unconfirmed"
  | "unsupported"
  | "not_entitled"
  | "unavailable"
  | "deprecated";

export interface CapabilityExplorerSnapshot {
  readonly generatedAt: string;
  readonly candidates: readonly {
    readonly providerId: string;
    readonly id: string;
    readonly category: string;
    readonly plane: string;
    readonly access: string;
    readonly status: CapabilityRegistryStatus;
  }[];
}

/** Application Layer port for a secret-free Capability Registry snapshot. */
export interface CapabilityExplorerRepository {
  loadSnapshot(): Promise<CapabilityExplorerSnapshot>;
}
