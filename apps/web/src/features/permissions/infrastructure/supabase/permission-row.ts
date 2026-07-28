import { z } from "zod";
import type { Permission } from "../../domain/entities/permission";

export const permissionRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  resource: z.string(),
  action: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PermissionRow = z.infer<typeof permissionRowSchema>;

/** Maps a validated `iam.permissions` row into the domain entity. */
export function toPermission(row: PermissionRow): Permission {
  return {
    id: row.id,
    code: row.code,
    resource: row.resource,
    action: row.action,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
