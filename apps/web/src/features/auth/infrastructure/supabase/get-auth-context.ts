import { parsePaysaveClaims, type AuthContext } from "@paysave/security";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./server-client";

/** Returns the authorization context from a cryptographically verified Supabase client session. */
export async function getAuthContextFromClient(
  supabase: Pick<SupabaseClient, "auth">,
): Promise<AuthContext | null> {
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  try {
    return parsePaysaveClaims(data.claims);
  } catch {
    console.error("AUTH_CONTEXT_PARSE_FAILED", {
      category: "claims_parse_error",
      correlationId: globalThis.crypto.randomUUID(),
    });
    return null;
  }
}

/** Returns the current authorization context from verified Supabase JWT claims. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  return getAuthContextFromClient(supabase);
}
