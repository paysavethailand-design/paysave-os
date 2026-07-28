import { permissionCodeSchema } from "@paysave/security";
import { z } from "zod";

const resourceSchema = z.string().trim().min(1).max(100);
const actionSchema = z.string().trim().min(1).max(100);

export const createPermissionSchema = z.object({
  code: permissionCodeSchema,
  resource: resourceSchema,
  action: actionSchema,
});
export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;

export const updatePermissionSchema = z
  .object({
    resource: resourceSchema.optional(),
    action: actionSchema.optional(),
  })
  .refine((value) => value.resource !== undefined || value.action !== undefined, {
    message: "At least one field must be provided",
  });
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
