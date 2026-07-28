import type { AuditSink } from "@paysave/observability";
import { retireAssetSchema } from "../dto/asset-schemas";
import { ASSET_RETIRED_STATUS_CODE } from "../../domain/asset-codes";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";
import type { Clock } from "../ports/clock";
import type { RequestContext } from "../ports/request-context";
import { changeAssetStatus } from "./change-asset-status";

export interface RetireAssetDeps {
  readonly repository: AssetRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * `DELETE /api/v1/assets/{assetId}` lifecycle equivalent: `asset.assets` has no `deleted_at` column
 * and no DELETE RLS policy, so retirement is a status transition to `retired`, delegated to
 * {@link changeAssetStatus} to keep the history-append behavior in one place.
 */
export async function retireAsset(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: RetireAssetDeps,
): Promise<Asset> {
  const input = retireAssetSchema.parse(rawInput);
  return changeAssetStatus(
    assetId,
    { toStatusCode: ASSET_RETIRED_STATUS_CODE, reasonCode: input.reasonCode },
    context,
    deps,
  );
}
