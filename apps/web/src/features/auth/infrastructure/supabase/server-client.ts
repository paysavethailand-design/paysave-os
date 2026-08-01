import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment } from "@/shared/config";

/** Creates a request-scoped Supabase server client using Next.js cookies. */
export async function createClient() {
  const cookieStore = await cookies();
  const environment = getPublicEnvironment();

  return createServerClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot mutate cookies; middleware performs token refresh.
        }
      },
    },
  });
}
