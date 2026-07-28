import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the Role CRUD + RBAC assignment API (checked in addition to DB RLS). */
export const ROLES_PERMISSIONS = {
  READ: "roles.read",
  MANAGE: "roles.manage",
} as const satisfies Record<string, PermissionCode>;
