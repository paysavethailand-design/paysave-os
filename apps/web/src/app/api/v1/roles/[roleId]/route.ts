import { requireApiPermission } from "@/features/auth/server";
import {
  deleteRoleUseCase,
  getRoleUseCase,
  ROLES_PERMISSIONS,
  updateRoleUseCase,
} from "@/features/roles/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly roleId: string;
}

/** Returns a single role. Requires `roles.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(ROLES_PERMISSIONS.READ);
  const role = await getRoleUseCase(params.roleId);
  return apiOk(role, correlationId);
});

/** Updates a role's name/status. Requires `roles.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updateRoleUseCase(params.roleId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});

/**
 * Soft-deletes a role (`deleted_at`/`deleted_by`/`delete_reason`). Requires `roles.manage` and a
 * non-empty `reason` in the request body — `iam.roles` has no DELETE RLS policy, only UPDATE.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const deleted = await deleteRoleUseCase(params.roleId, body, { actor, correlationId });
  return apiOk(deleted, correlationId);
});
