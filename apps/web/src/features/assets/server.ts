import { ConsoleAuditSink } from "@paysave/observability";
import type { AuthContext } from "@paysave/security";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { changeAssetStatus } from "./application/commands/change-asset-status";
import { createAsset } from "./application/commands/create-asset";
import { retireAsset } from "./application/commands/retire-asset";
import { updateAsset } from "./application/commands/update-asset";
import type { RequestContext } from "./application/ports/request-context";
import { getAsset } from "./application/queries/get-asset";
import { getAssetTimeline } from "./application/queries/get-asset-timeline";
import { getInventoryDashboard } from "./application/queries/get-inventory-dashboard";
import { listAssets } from "./application/queries/list-assets";
import type { Asset } from "./domain/entities/asset";
import type { AssetRepository } from "./application/ports/asset-repository";
import type { InventoryAnalyticsRepository } from "./application/ports/inventory-analytics-repository";

const auditSink = new ConsoleAuditSink();
const clock = { now: () => new Date() };

async function repository(): Promise<AssetRepository> {
  return databaseProvider().repositories.assets();
}

async function analyticsRepository(): Promise<InventoryAnalyticsRepository> {
  return databaseProvider().repositories.inventoryAnalytics();
}

/** Server-only public API composition root for the assets feature. */
export async function listAssetsUseCase(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
): Promise<BoundedPage<Asset>> {
  return listAssets(pageRequest, requestedPartnerId, actor, await repository());
}

export async function getAssetUseCase(assetId: string): Promise<Asset> {
  return getAsset(assetId, await repository());
}

export async function getAssetTimelineUseCase(
  assetId: string,
  requestedPartnerId: string | null,
  actor: AuthContext,
) {
  return getAssetTimeline(assetId, requestedPartnerId, actor, await analyticsRepository());
}

export async function getInventoryDashboardUseCase(
  requestedPartnerId: string | null,
  actor: AuthContext,
) {
  return getInventoryDashboard(requestedPartnerId, actor, await analyticsRepository(), clock);
}

export async function createAssetUseCase(
  rawInput: unknown,
  context: RequestContext,
): Promise<Asset> {
  return createAsset(rawInput, context, { repository: await repository(), auditSink });
}

export async function updateAssetUseCase(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Asset> {
  return updateAsset(assetId, rawInput, context, { repository: await repository(), auditSink });
}

export async function changeAssetStatusUseCase(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Asset> {
  return changeAssetStatus(assetId, rawInput, context, {
    repository: await repository(),
    auditSink,
    clock,
  });
}

export async function retireAssetUseCase(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Asset> {
  return retireAsset(assetId, rawInput, context, {
    repository: await repository(),
    auditSink,
    clock,
  });
}

export type { Asset } from "./domain/entities/asset";
export { ASSET_RETIRED_STATUS_CODE, ASSETS_PERMISSIONS } from "./domain/asset-codes";
export type { RequestContext } from "./application/ports/request-context";
