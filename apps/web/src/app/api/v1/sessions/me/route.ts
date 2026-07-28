import { requireApiAuth, signOutCurrentSession, toSessionView } from "@/features/auth/server";
import { apiOk, withApiRoute } from "@/shared/lib/api-response";

/** Returns the caller's own verified session (identity, active partner, roles, permissions). */
export const GET = withApiRoute(async (_request, correlationId) => {
  const context = await requireApiAuth();
  return apiOk(toSessionView(context), correlationId);
});

/** Revokes the caller's current Supabase session. */
export const DELETE = withApiRoute(async (_request, correlationId) => {
  await requireApiAuth();
  await signOutCurrentSession();
  return apiOk({ signedOut: true }, correlationId);
});
