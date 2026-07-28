import { requireApiPermission } from "@/features/auth/server";
import {
  deactivateUserUseCase,
  getUserUseCase,
  updateUserUseCase,
  USERS_PERMISSIONS,
} from "@/features/users/server";
import {
  apiOk,
  readJsonBody,
  readOptionalJsonBody,
  withApiParamsRoute,
} from "@/shared/lib/api-response";

interface RouteParams {
  readonly userId: string;
}

/** Returns a single user profile. Requires `users.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(USERS_PERMISSIONS.READ);
  const user = await getUserUseCase(params.userId);
  return apiOk(user, correlationId);
});

/** Updates a user's display name/status. Requires `users.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(USERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updateUserUseCase(params.userId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});

/**
 * Deactivates a user (status → `suspended`). `iam.users` has no `deleted_at` column and no DELETE
 * RLS policy, so this is a lifecycle transition, not a row deletion. Requires `users.manage`.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(USERS_PERMISSIONS.MANAGE);
  const body = await readOptionalJsonBody(request);
  const deactivated = await deactivateUserUseCase(params.userId, body, { actor, correlationId });
  return apiOk(deactivated, correlationId);
});
