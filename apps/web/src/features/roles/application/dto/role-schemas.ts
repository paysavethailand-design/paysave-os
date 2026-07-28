import { z } from "zod";

const codeSchema = z.string().trim().min(1).max(100);
const nameSchema = z.string().trim().min(1).max(255);
const statusSchema = z.string().trim().min(1).max(100);
const reasonSchema = z.string().trim().min(1).max(100);

export const createRoleSchema = z.object({
  partnerId: z.uuid().nullable().optional(),
  templateId: z.uuid().nullable().optional(),
  code: codeSchema,
  name: nameSchema,
  status: statusSchema.default("active"),
});
export type CreateRoleInput = z.infer<typeof createRoleSchema>;

export const updateRoleSchema = z
  .object({
    name: nameSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => value.name !== undefined || value.status !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

export const deleteRoleSchema = z.object({ reason: reasonSchema });
export type DeleteRoleInput = z.infer<typeof deleteRoleSchema>;
