/** Server-only public API for the authentication feature. */
export { createClient as createAuthServerClient } from "./infrastructure/supabase/server-client";
export {
  getAuthContext,
  getAuthContextFromClient,
} from "./infrastructure/supabase/get-auth-context";
export { updateSession } from "./infrastructure/supabase/update-session";
export { signOutCurrentSession } from "./infrastructure/supabase/sign-out";
export { requireAuth } from "./presentation/server/require-auth";
export { requirePermission } from "./presentation/server/require-permission";
export { requireApiAuth } from "./presentation/server/require-api-auth";
export {
  requireApiPermission,
  requireApiPermissions,
} from "./presentation/server/require-api-permission";
export { getSafeRedirectPath } from "./presentation/sign-in-schema";
export { getAuthenticatedLandingRoute } from "./application/session-navigation";
export { toSessionView, type SessionView } from "./application/queries/get-current-session";
