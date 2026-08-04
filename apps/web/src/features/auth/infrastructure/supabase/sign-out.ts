import { createClient } from "./server-client";

/** Revokes the current Supabase session without redirecting (for `/api/v1` Route Handlers). */
export async function signOutCurrentSession(): Promise<void> {
  const correlationId = globalThis.crypto.randomUUID();

  try {
    const supabase = await createClient({ correlationId, cookieWriteMode: "required" });
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch {
    console.error("AUTH_SIGN_OUT_FAILED", {
      category: "session_clear_failed",
      correlationId,
    });
    throw new Error("AUTH_SIGN_OUT_FAILED");
  }
}
