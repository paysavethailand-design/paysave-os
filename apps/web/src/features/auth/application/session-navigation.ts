import { hasEveryPermission, type AuthContext } from "@paysave/security";
import { getRoutePolicy, isPublicRoute } from "./route-authorization";

/** Determines the safe redirect required for the current route and verified session. */
export function resolveSessionRedirect(
  pathname: string,
  context: AuthContext | null,
): string | null {
  if (context && isPublicRoute(pathname)) {
    return "/";
  }

  const policy = getRoutePolicy(pathname);
  if (policy.authenticationRequired && !context) {
    return "/sign-in";
  }

  if (context && !hasEveryPermission(context, policy.permissions)) {
    return "/unauthorized";
  }

  return null;
}
