import { requireApiPermission } from "@/features/auth/server";
import {
  attachRolePermissionUseCase,
  listRolePermissionsUseCase,
  ROLES_PERMISSIONS,
} from "@/features/roles/server";
import { apiCreated, apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly roleId: string;
}

/** Lists permissions granted to a role. Requires `roles.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.READ);
  const grants = await listRolePermissionsUseCase(params.roleId, actor);
  return apiOk(grants, correlationId);
});

/** Grants a permission to a role. Requires `roles.manage`. */
export const POST = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await attachRolePermissionUseCase(params.roleId, body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
