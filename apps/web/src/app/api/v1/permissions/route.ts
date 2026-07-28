import { requireApiPermission } from "@/features/auth/server";
import {
  createPermissionUseCase,
  listPermissionsUseCase,
  PERMISSIONS_PERMISSIONS,
} from "@/features/permissions/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists platform-wide permissions. Requires `permissions.read`. */
export const GET = withApiRoute(async (request, correlationId) => {
  await requireApiPermission(PERMISSIONS_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const page = await listPermissionsUseCase(pageRequest);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/** Creates a platform-wide permission. Requires `permissions.manage` (global admin per RLS). */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(PERMISSIONS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createPermissionUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
