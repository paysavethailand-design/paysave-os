import { z } from "zod";

const displayRefSchema = z.string().trim().min(1).max(2000);
const statusCodeSchema = z.string().trim().min(1).max(100);
const reasonCodeSchema = z.string().trim().min(1).max(100);

export const createAssetSchema = z.object({
  partnerId: z.uuid().nullable().optional(),
  assetTypeId: z.uuid(),
  businessObjectId: z.uuid(),
  displayRef: displayRefSchema,
  currentStatusCode: statusCodeSchema,
  currentOwnerCustomerId: z.uuid().nullable().optional(),
});
export type CreateAssetInput = z.infer<typeof createAssetSchema>;

export const updateAssetSchema = z
  .object({
    displayRef: displayRefSchema.optional(),
    currentOwnerCustomerId: z.uuid().nullable().optional(),
    expectedVersionNo: z.number().int().positive(),
  })
  .refine((value) => value.displayRef !== undefined || value.currentOwnerCustomerId !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>;

export const changeAssetStatusSchema = z.object({
  toStatusCode: statusCodeSchema,
  reasonCode: reasonCodeSchema,
});
export type ChangeAssetStatusInput = z.infer<typeof changeAssetStatusSchema>;

export const retireAssetSchema = z.object({ reasonCode: reasonCodeSchema });
export type RetireAssetInput = z.infer<typeof retireAssetSchema>;
