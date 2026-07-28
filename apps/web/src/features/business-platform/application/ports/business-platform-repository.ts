import type { BusinessPlatformModuleId } from "../../domain/business-platform";

export type BusinessPlatformSnapshotStatus = "READY" | "NOT_STARTED";

export interface BusinessPlatformModuleSnapshot {
  readonly id: BusinessPlatformModuleId;
  readonly stage: `5.4${"A" | "B" | "C" | "D" | "E" | "F" | "G"}`;
  readonly title: string;
  readonly description: string;
  readonly status: BusinessPlatformSnapshotStatus;
}

export interface BusinessPlatformSnapshot {
  readonly publishedAt: string;
  readonly modules: readonly BusinessPlatformModuleSnapshot[];
}

/** Read-only Business Platform port. Mutation and provider controls are deliberately absent. */
export interface BusinessPlatformRepository {
  loadSnapshot(): Promise<BusinessPlatformSnapshot>;
}
