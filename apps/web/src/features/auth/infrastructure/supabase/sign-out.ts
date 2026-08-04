import { createClient } from "./server-client";

/** Revokes the current Supabase session without redirecting (for `/api/v1` Route Handlers). */
export async function signOutCurrentSession(): Promise<void> {
  const supabase = await createClient({ cookieWriteMode: "required" });
  await supabase.auth.signOut();
}
