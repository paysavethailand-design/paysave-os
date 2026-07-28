import { z } from "zod";

const displayNameSchema = z.string().trim().min(1).max(255);
const customerTypeSchema = z.string().trim().min(1).max(100);
const statusSchema = z.string().trim().min(1).max(100);
const reasonSchema = z.string().trim().min(1).max(100);

export const createCustomerSchema = z.object({
  partnerId: z.uuid().nullable().optional(),
  customerType: customerTypeSchema,
  displayName: displayNameSchema,
  status: statusSchema.default("active"),
});
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

export const updateCustomerSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.status !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

export const deleteCustomerSchema = z.object({ reason: reasonSchema });
export type DeleteCustomerInput = z.infer<typeof deleteCustomerSchema>;
