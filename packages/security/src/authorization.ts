import type { AuthContext, PermissionCode } from "./auth-context";

/** Returns true only when the verified session contains the requested permission. */
export function hasPermission(context: AuthContext, permission: PermissionCode): boolean {
  return context.permissions.includes(permission);
}

/** Returns true only when the verified session contains every requested permission. */
export function hasEveryPermission(
  context: AuthContext,
  permissions: readonly PermissionCode[],
): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

/** Returns true when the verified session contains at least one requested permission. */
export function hasAnyPermission(
  context: AuthContext,
  permissions: readonly PermissionCode[],
): boolean {
  return permissions.some((permission) => hasPermission(context, permission));
}
