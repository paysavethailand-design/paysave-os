import { requireApiPermission } from "@/features/auth/server";
import {
  ASSETS_PERMISSIONS,
  createAssetUseCase,
  listAssetsUseCase,
} from "@/features/assets/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists assets in a partner scope. Requires `assets.read`. `partnerId` query param is required for global admins. */
export const GET = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const requestedPartnerId = request.nextUrl.searchParams.get("partnerId");
  const page = await listAssetsUseCase(pageRequest, requestedPartnerId, actor);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/** Creates a tenant-scoped asset. Requires `assets.manage`. */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(ASSETS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createAssetUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
