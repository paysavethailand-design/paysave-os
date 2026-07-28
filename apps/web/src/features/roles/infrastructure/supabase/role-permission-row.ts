import { z } from "zod";
import type { RolePermission } from "../../domain/entities/role-permission";

export const rolePermissionRowSchema = z.object({
  id: z.uuid(),
  partner_id: z.uuid(),
  role_id: z.uuid(),
  permission_id: z.uuid(),
  effect: z.enum(["allow", "deny"]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RolePermissionRow = z.infer<typeof rolePermissionRowSchema>;

/** Maps a validated `iam.role_permissions` row into the domain entity. */
export function toRolePermission(row: RolePermissionRow): RolePermission {
  return {
    id: row.id,
    partnerId: row.partner_id,
    roleId: row.role_id,
    permissionId: row.permission_id,
    effect: row.effect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
