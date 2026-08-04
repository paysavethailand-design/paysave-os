import { hasEveryPermission, type AuthContext, type RoleCode } from "@paysave/security";
import {
  getRoutePolicy,
  isAuthenticationRoute,
  isLegacyAuthenticationRoute,
} from "./route-authorization";

const roleLandingRoutes: ReadonlyArray<{
  readonly roles: readonly RoleCode[];
  readonly route: string;
}> = [
  { roles: ["super_admin", "admin"], route: "/dashboard/admin" },
  { roles: ["partner"], route: "/dashboard/partner" },
  { roles: ["supervisor"], route: "/dashboard/supervisor" },
  { roles: ["agent"], route: "/dashboard/personal" },
];

/** Resolves the existing role dashboard without requiring permission grants. */
export function getAuthenticatedLandingRoute(roles: readonly RoleCode[]): string {
  return (
    roleLandingRoutes.find((entry) => entry.roles.some((role) => roles.includes(role)))?.route ??
    "/unauthorized"
  );
}

/** Determines the safe redirect required for the current route and verified session. */
export function resolveSessionRedirect(
  pathname: string,
  context: AuthContext | null,
): string | null {
  if (!context && isLegacyAuthenticationRoute(pathname)) {
    return "/sign-in";
  }

  if (context && isAuthenticationRoute(pathname)) {
    return getAuthenticatedLandingRoute(context.roles);
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
