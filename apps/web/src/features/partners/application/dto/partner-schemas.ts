import { z } from "zod";

const codeSchema = z.string().trim().min(1).max(100);
const nameSchema = z.string().trim().min(1).max(255);
const statusSchema = z.string().trim().min(1).max(100);
const timezoneSchema = z.string().trim().min(1).max(100);
const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "must be a 3-letter ISO currency code");
const reasonSchema = z.string().trim().min(1).max(100);

export const createPartnerSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  status: statusSchema.default("active"),
  timezone: timezoneSchema,
  defaultCurrency: currencySchema,
});
export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;

export const updatePartnerSchema = z
  .object({
    name: nameSchema.optional(),
    status: statusSchema.optional(),
    timezone: timezoneSchema.optional(),
    defaultCurrency: currencySchema.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), {
    message: "At least one field must be provided",
  });
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;

export const deletePartnerSchema = z.object({ reason: reasonSchema });
export type DeletePartnerInput = z.infer<typeof deletePartnerSchema>;
