import { requireApiPermission } from "@/features/auth/server";
import { ASSETS_PERMISSIONS, getAssetTimelineUseCase } from "@/features/assets/server";
import { apiOk, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly assetId: string;
}

/** Returns the immutable tenant-scoped lifecycle timeline for one asset. */
export const GET = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.READ);
  const timeline = await getAssetTimelineUseCase(
    params.assetId,
    request.nextUrl.searchParams.get("partnerId"),
    actor,
  );
  const response = apiOk(timeline, correlationId);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
});
