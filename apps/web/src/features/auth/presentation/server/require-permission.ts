import { hasPermission, type AuthContext, type PermissionCode } from "@paysave/security";
import { redirect } from "next/navigation";
import { requireAuth } from "./require-auth";

/** Requires an explicit permission from verified JWT claims before rendering server content. */
export async function requirePermission(
  permission: PermissionCode,
  nextPath: string,
): Promise<AuthContext> {
  const context = await requireAuth(nextPath);
  if (!hasPermission(context, permission)) {
    redirect("/unauthorized");
  }
  return context;
}
