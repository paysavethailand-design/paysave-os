import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type {
  AssetTimelineEvent,
  InventoryAnalyticsRepository,
} from "../ports/inventory-analytics-repository";

/** Returns one item's tenant-scoped lifecycle timeline. */
export async function getAssetTimeline(
  assetId: string,
  requestedPartnerId: string | null,
  actor: AuthContext,
  repository: InventoryAnalyticsRepository,
): Promise<readonly AssetTimelineEvent[]> {
  const scope = resolveWritePartnerId(actor, requestedPartnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const timeline = await repository.listTimeline(scope.partnerId, assetId);
  if (!timeline) throw new ApiError("not_found", `Asset not found: ${assetId}`);
  return timeline;
}
