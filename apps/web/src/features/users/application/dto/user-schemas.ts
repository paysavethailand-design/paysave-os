import { z } from "zod";
import { USER_STATUS } from "../../domain/user-codes";

const displayNameSchema = z.string().trim().min(1).max(255);
const statusSchema = z.string().trim().min(1).max(100);

export const createUserSchema = z.object({
  authSubject: z.uuid(),
  displayName: displayNameSchema,
  status: statusSchema.default(USER_STATUS.ACTIVE),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    displayName: displayNameSchema.optional(),
    status: statusSchema.optional(),
  })
  .refine((value) => value.displayName !== undefined || value.status !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const deactivateUserSchema = z.object({
  reason: z.string().trim().min(1).max(200).optional(),
});
export type DeactivateUserInput = z.infer<typeof deactivateUserSchema>;
