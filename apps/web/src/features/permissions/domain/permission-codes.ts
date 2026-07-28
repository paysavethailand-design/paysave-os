import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the Permission CRUD API (checked in addition to DB RLS). */
export const PERMISSIONS_PERMISSIONS = {
  READ: "permissions.read",
  MANAGE: "permissions.manage",
} as const satisfies Record<string, PermissionCode>;
