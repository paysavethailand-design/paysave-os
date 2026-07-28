import {
  hasEveryPermission,
  hasPermission,
  type AuthContext,
  type PermissionCode,
} from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import { requireApiAuth } from "./require-api-auth";

/** Requires an authenticated session holding one explicit permission; role names alone never suffice. */
export async function requireApiPermission(permission: PermissionCode): Promise<AuthContext> {
  const context = await requireApiAuth();
  if (!hasPermission(context, permission)) {
    throw new ApiError("forbidden", `Missing required permission: ${permission}`);
  }
  return context;
}

/** Requires an authenticated session holding every listed permission. */
export async function requireApiPermissions(
  permissions: readonly PermissionCode[],
): Promise<AuthContext> {
  const context = await requireApiAuth();
  if (!hasEveryPermission(context, permissions)) {
    throw new ApiError("forbidden", `Missing required permissions: ${permissions.join(", ")}`);
  }
  return context;
}
