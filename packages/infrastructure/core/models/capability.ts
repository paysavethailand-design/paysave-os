export type CapabilityStatus =
  | "supported"
  | "partial"
  | "experimental"
  | "unconfirmed"
  | "unsupported"
  | "not_entitled"
  | "unavailable"
  | "deprecated";

export type CapabilityAccess = "read" | "write" | "destructive" | "purchase";

export type CapabilityPlane = "control" | "data" | "source" | "shared";

export interface CapabilityDescriptor {
  readonly id: string;
  readonly category: string;
  readonly plane: CapabilityPlane;
  readonly status: CapabilityStatus;
  readonly access: CapabilityAccess;
  readonly officialReferences: readonly string[];
  readonly limitations?: readonly string[];
  readonly requiredResourceTypes?: readonly string[];
}

export interface CapabilityCandidate {
  readonly providerId: string;
  readonly capability: CapabilityDescriptor;
}
