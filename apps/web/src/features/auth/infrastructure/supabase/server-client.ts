import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getPublicEnvironment } from "@/shared/config";

export interface CreateAuthServerClientOptions {
  readonly correlationId?: string;
  readonly cookieWriteMode?: "read-only" | "required";
}

/** Creates a request-scoped Supabase server client using Next.js cookies. */
export async function createClient(options: CreateAuthServerClientOptions = {}) {
  const cookieStore = await cookies();
  const environment = getPublicEnvironment();
  const correlationId = options.correlationId ?? globalThis.crypto.randomUUID();
  const cookieWriteMode = options.cookieWriteMode ?? "read-only";

  return createServerClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (cookieWriteMode === "read-only") {
          console.warn("AUTH_COOKIE_WRITE_DEFERRED", {
            category: "middleware_managed_cookie_refresh",
            correlationId,
          });
          return;
        }

        try {
          cookiesToSet.forEach(({ name, value, options: cookieOptions }) =>
            cookieStore.set(name, value, cookieOptions),
          );
        } catch (error) {
          console.error("AUTH_COOKIE_SET_FAILED", {
            category: "cookie_store_write_error",
            correlationId,
          });
          throw error;
        }
      },
    },
  });
}
