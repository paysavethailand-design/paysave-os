import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the Customer CRUD API (checked in addition to DB RLS). */
export const CUSTOMERS_PERMISSIONS = {
  READ: "customers.read",
  MANAGE: "customers.manage",
} as const satisfies Record<string, PermissionCode>;
