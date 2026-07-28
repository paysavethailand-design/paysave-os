import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the Partner CRUD API (checked in addition to DB RLS). */
export const PARTNERS_PERMISSIONS = {
  READ: "partners.read",
  MANAGE: "partners.manage",
} as const satisfies Record<string, PermissionCode>;
