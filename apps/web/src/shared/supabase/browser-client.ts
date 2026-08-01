import { createBrowserClient } from "@supabase/ssr";
import { getPublicEnvironment } from "@/shared/config";

/** Creates a browser-scoped Supabase client that persists the session in secure cookies. */
export function createClient() {
  const environment = getPublicEnvironment();
  return createBrowserClient(environment.supabaseUrl, environment.supabasePublishableKey);
}
