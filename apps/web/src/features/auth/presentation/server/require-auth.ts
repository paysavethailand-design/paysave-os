import type { AuthContext } from "@paysave/security";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "../../infrastructure/supabase/get-auth-context";

/** Requires a verified session and redirects unauthenticated users to sign in. */
export async function requireAuth(nextPath = "/"): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}` as Route);
  }
  return context;
}
