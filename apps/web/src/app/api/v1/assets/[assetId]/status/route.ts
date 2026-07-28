import { requireApiPermission } from "@/features/auth/server";
import { ASSETS_PERMISSIONS, changeAssetStatusUseCase } from "@/features/assets/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly assetId: string;
}

/**
 * Transitions an asset's lifecycle status, appending an immutable `asset_status_history` row.
 * Requires `assets.manage`.
 */
export const POST = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await changeAssetStatusUseCase(params.assetId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});
