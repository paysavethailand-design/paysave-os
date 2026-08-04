import { parsePaysaveClaims, type AuthContext } from "@paysave/security";
import { createClient } from "./server-client";

/** Returns the authorization context from cryptographically verified Supabase JWT claims. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
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
