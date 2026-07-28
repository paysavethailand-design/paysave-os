import type { AuthContext } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import { getAuthContext } from "../../infrastructure/supabase/get-auth-context";

/**
 * Requires a verified session for an `/api/v1` Route Handler. Unlike {@link requireAuth}, this
 * throws an {@link ApiError} instead of issuing a Next.js redirect, since a JSON API caller cannot
 * follow one.
 */
export async function requireApiAuth(): Promise<AuthContext> {
  const context = await getAuthContext();
  if (!context) {
    throw new ApiError("unauthenticated", "Authentication is required");
  }
  return context;
}
