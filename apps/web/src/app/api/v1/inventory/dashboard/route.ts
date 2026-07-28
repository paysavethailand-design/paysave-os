import { requireApiPermission } from "@/features/auth/server";
import { ASSETS_PERMISSIONS, getInventoryDashboardUseCase } from "@/features/assets/server";
import { apiOk, withApiRoute } from "@/shared/lib/api-response";

/** Returns tenant-scoped inventory and current-month sales projections. This endpoint is read-only. */
export const GET = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.READ);
  const dashboard = await getInventoryDashboardUseCase(
    request.nextUrl.searchParams.get("partnerId"),
    actor,
  );
  const response = apiOk(dashboard, correlationId);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
});
