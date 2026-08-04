import type { PermissionCode } from "@paysave/security";

export interface RoutePolicy {
  readonly authenticationRequired: boolean;
  readonly permissions: readonly PermissionCode[];
}

const authenticationRoutePrefixes = ["/login", "/sign-in"] as const;
const publicRoutePrefixes = [
  ...authenticationRoutePrefixes,
  "/auth/callback",
  "/healthz",
  "/readyz",
  "/version",
  "/metrics",
] as const;
const protectedRoutePolicies: ReadonlyArray<{
  readonly prefix: string;
  readonly permissions: readonly PermissionCode[];
}> = [
  { prefix: "/admin", permissions: ["users.manage"] },
  { prefix: "/partners", permissions: ["partners.read"] },
  { prefix: "/supervisor", permissions: ["assignments.manage"] },
  { prefix: "/agent", permissions: ["assignments.read"] },
];

/** Allows non-production visual previews only when an explicit runtime gate is enabled. */
export function canAccessDesignPreview(pathname: string, enabled: boolean): boolean {
  return enabled && (pathname === "/preview" || pathname.startsWith("/preview/"));
}

/** Returns whether a route is accessible without an authenticated session. */
export function isPublicRoute(pathname: string): boolean {
  return publicRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Returns whether the route is an authentication entry screen. */
export function isAuthenticationRoute(pathname: string): boolean {
  return authenticationRoutePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Resolves the centralized authentication and permission policy for a route. */
export function getRoutePolicy(pathname: string): RoutePolicy {
  if (isPublicRoute(pathname)) {
    return { authenticationRequired: false, permissions: [] };
  }

  const configuredPolicy = protectedRoutePolicies.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  return {
    authenticationRequired: true,
    permissions: configuredPolicy?.permissions ?? [],
  };
}
