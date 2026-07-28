import { z } from "zod";
import type { Role } from "../../domain/entities/role";

export const roleRowSchema = z.object({
  id: z.uuid(),
  partner_id: z.uuid(),
  template_id: z.uuid().nullable(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type RoleRow = z.infer<typeof roleRowSchema>;

/** Maps a validated `iam.roles` row into the domain entity. */
export function toRole(row: RoleRow): Role {
  return {
    id: row.id,
    partnerId: row.partner_id,
    templateId: row.template_id,
    code: row.code,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
