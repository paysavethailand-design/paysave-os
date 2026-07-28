import type { AuthContext, PermissionCode, RoleCode } from "@paysave/security";

export interface SessionView {
  readonly userId: string;
  readonly activePartnerId: string | null;
  readonly roles: readonly RoleCode[];
  readonly permissions: readonly PermissionCode[];
  readonly tenantScope: "active" | "all";
  readonly sessionVersion: number;
}

/** Maps a verified auth context into the public shape returned by the Session Management API. */
export function toSessionView(context: AuthContext): SessionView {
  return {
    userId: context.userId,
    activePartnerId: context.activePartnerId,
    roles: context.roles,
    permissions: context.permissions,
    tenantScope: context.tenantScope,
    sessionVersion: context.sessionVersion,
  };
}
