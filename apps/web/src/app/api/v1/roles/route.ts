import { requireApiPermission } from "@/features/auth/server";
import { createRoleUseCase, listRolesUseCase, ROLES_PERMISSIONS } from "@/features/roles/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists roles in a partner scope. Requires `roles.read`. `partnerId` query param is required for global admins. */
export const GET = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const requestedPartnerId = request.nextUrl.searchParams.get("partnerId");
  const page = await listRolesUseCase(pageRequest, requestedPartnerId, actor);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/** Creates a tenant-scoped role. Requires `roles.manage`. */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createRoleUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
