import { requireApiPermission } from "@/features/auth/server";
import {
  getPermissionUseCase,
  PERMISSIONS_PERMISSIONS,
  updatePermissionUseCase,
} from "@/features/permissions/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly permissionId: string;
}

/** Returns a single permission. Requires `permissions.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(PERMISSIONS_PERMISSIONS.READ);
  const permission = await getPermissionUseCase(params.permissionId);
  return apiOk(permission, correlationId);
});

/** Updates a permission's resource/action classification. Requires `permissions.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(PERMISSIONS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updatePermissionUseCase(params.permissionId, body, {
    actor,
    correlationId,
  });
  return apiOk(updated, correlationId);
});
