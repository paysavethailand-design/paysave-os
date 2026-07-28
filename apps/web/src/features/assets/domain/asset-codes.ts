import type { PermissionCode } from "@paysave/security";

/** Application permission codes gating the Asset CRUD API (checked in addition to DB RLS). */
export const ASSETS_PERMISSIONS = {
  READ: "assets.read",
  MANAGE: "assets.manage",
} as const satisfies Record<string, PermissionCode>;

/** `asset.assets` has no `deleted_at` column; retirement is modeled as a status transition. */
export const ASSET_RETIRED_STATUS_CODE = "retired";
