import { requireApiPermission } from "@/features/auth/server";
import {
  ASSETS_PERMISSIONS,
  getAssetUseCase,
  retireAssetUseCase,
  updateAssetUseCase,
} from "@/features/assets/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly assetId: string;
}

/** Returns a single asset. Requires `assets.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(ASSETS_PERMISSIONS.READ);
  const asset = await getAssetUseCase(params.assetId);
  return apiOk(asset, correlationId);
});

/** Updates an asset's display reference/current owner. Requires `assets.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updateAssetUseCase(params.assetId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});

/**
 * Retires an asset (status transition to `retired`, appended to `asset_status_history`). Requires
 * `assets.manage` and a non-empty `reasonCode` — `asset.assets` has no `deleted_at` column and no
 * DELETE RLS policy.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const retired = await retireAssetUseCase(params.assetId, body, { actor, correlationId });
  return apiOk(retired, correlationId);
});
