import { requireApiPermission } from "@/features/auth/server";
import { detachRolePermissionUseCase, ROLES_PERMISSIONS } from "@/features/roles/server";
import { withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly roleId: string;
  readonly permissionId: string;
}

/**
 * Always responds 501: revoking an `iam.role_permissions` grant has no supported DML path this
 * sprint (no `deleted_at`/`valid_to` column, no DELETE RLS policy). See `detachRolePermission` for
 * the full explanation. Still requires `roles.manage` and validates the role/grant exist first.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  const actor = await requireApiPermission(ROLES_PERMISSIONS.MANAGE);
  return detachRolePermissionUseCase(params.roleId, params.permissionId, { actor, correlationId });
});
