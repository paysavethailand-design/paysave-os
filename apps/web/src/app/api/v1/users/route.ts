import { requireApiPermission } from "@/features/auth/server";
import { createUserUseCase, listUsersUseCase, USERS_PERMISSIONS } from "@/features/users/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists user directory profiles. Requires `users.read` (admin directory API). */
export const GET = withApiRoute(async (request, correlationId) => {
  await requireApiPermission(USERS_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const page = await listUsersUseCase(pageRequest);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/**
 * Registers an `iam.users` profile for an auth identity provisioned out of band in Supabase Auth.
 * Requires `users.manage` (global admin per RLS).
 */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(USERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createUserUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
