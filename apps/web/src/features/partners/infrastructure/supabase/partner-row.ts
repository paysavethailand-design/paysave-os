import { z } from "zod";
import type { Partner } from "../../domain/entities/partner";

export const partnerRowSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  status: z.string(),
  timezone: z.string(),
  default_currency: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});
export type PartnerRow = z.infer<typeof partnerRowSchema>;

/** Maps a validated `tenant.partners` row into the domain entity. */
export function toPartner(row: PartnerRow): Partner {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    status: row.status,
    timezone: row.timezone,
    defaultCurrency: row.default_currency,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}
