import { z } from "zod";

export const attachRolePermissionSchema = z.object({
  permissionId: z.uuid(),
  effect: z.enum(["allow", "deny"]).default("allow"),
});
export type AttachRolePermissionInput = z.infer<typeof attachRolePermissionSchema>;
