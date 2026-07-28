import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the User CRUD API (checked in addition to DB RLS). */
export const USERS_PERMISSIONS = {
  READ: "users.read",
  MANAGE: "users.manage",
} as const satisfies Record<string, PermissionCode>;

/** `iam.users.status` has no fixed check constraint, but the API only writes these known values. */
export const USER_STATUS = {
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;
