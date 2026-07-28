import type {
  AssetTypeDimension,
  InventoryAssetSnapshot,
  InventoryStatusEvent,
} from "../queries/project-inventory-dashboard";

export interface AssetTimelineEvent {
  readonly status: string;
  readonly user: string | null;
  readonly dateTime: string;
  readonly action: string;
  readonly fromStatus: string | null;
}

export interface InventoryAnalyticsSnapshot {
  readonly assets: readonly InventoryAssetSnapshot[];
  readonly events: readonly InventoryStatusEvent[];
  readonly assetTypes: readonly AssetTypeDimension[];
}

/** Read-only inventory/history projection port; it does not expose any mutation surface. */
export interface InventoryAnalyticsRepository {
  loadSnapshot(partnerId: string): Promise<InventoryAnalyticsSnapshot>;
  listTimeline(partnerId: string, assetId: string): Promise<readonly AssetTimelineEvent[] | null>;
}
