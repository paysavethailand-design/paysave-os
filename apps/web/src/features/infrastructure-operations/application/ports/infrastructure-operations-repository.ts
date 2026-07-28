export type OperationsRegistryStatus =
  | "supported"
  | "partial"
  | "experimental"
  | "unconfirmed"
  | "unsupported"
  | "not_entitled"
  | "unavailable"
  | "deprecated";

export interface InfrastructureOperationsSnapshot {
  readonly generatedAt: string;
  readonly providers: readonly string[];
  readonly capabilities: readonly {
    readonly providerId: string;
    readonly id: string;
    readonly category: string;
    readonly plane: string;
    readonly access: string;
    readonly status: OperationsRegistryStatus;
  }[];
}

/** Application Layer port for Provider and Capability Registry snapshots. */
export interface InfrastructureOperationsRepository {
  loadSnapshot(): Promise<InfrastructureOperationsSnapshot>;
}
