import { z } from "zod";
import type { Asset } from "../../domain/entities/asset";

export const assetRowSchema = z.object({
  id: z.uuid(),
  partner_id: z.uuid(),
  asset_type_id: z.uuid(),
  business_object_id: z.uuid(),
  display_ref: z.string(),
  current_status_code: z.string(),
  current_owner_customer_id: z.uuid().nullable(),
  version_no: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type AssetRow = z.infer<typeof assetRowSchema>;

/** Maps a validated `asset.assets` row into the domain entity. */
export function toAsset(row: AssetRow): Asset {
  return {
    id: row.id,
    partnerId: row.partner_id,
    assetTypeId: row.asset_type_id,
    businessObjectId: row.business_object_id,
    displayRef: row.display_ref,
    currentStatusCode: row.current_status_code,
    currentOwnerCustomerId: row.current_owner_customer_id,
    versionNo: row.version_no,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
