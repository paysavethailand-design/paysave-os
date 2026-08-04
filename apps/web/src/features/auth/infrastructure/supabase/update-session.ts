import { parsePaysaveClaims, type AuthContext } from "@paysave/security";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import {
  canAccessDesignPreview,
  isAuthenticationRoute,
} from "../../application/route-authorization";
import { resolveSessionRedirect } from "../../application/session-navigation";
import { getPublicEnvironment, getServerEnvironment } from "@/shared/config";

/** Copies refreshed authentication cookies onto a redirect response. */
function createRedirectResponse(
  request: NextRequest,
  sourceResponse: NextResponse,
  destination: string,
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destination;
  url.search = "";
  if (destination === "/sign-in" && !isAuthenticationRoute(request.nextUrl.pathname)) {
    url.searchParams.set("next", request.nextUrl.pathname);
  }

  const redirectResponse = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
  return redirectResponse;
}

/** Refreshes Supabase access tokens and applies centralized route authorization. */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const serverEnvironment = getServerEnvironment();
  if (canAccessDesignPreview(request.nextUrl.pathname, serverEnvironment.enableDesignPreview)) {
    return NextResponse.next({ request });
  }

  const environment = getPublicEnvironment();
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(environment.supabaseUrl, environment.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const correlationId = globalThis.crypto.randomUUID();
  const { data, error } = await supabase.auth.getClaims();
  let context: AuthContext | null = null;
  if (error) {
    console.error("AUTH_CLAIMS_VERIFICATION_FAILED", {
      category: "claims_verification_error",
      correlationId,
    });
  } else if (data?.claims) {
    try {
      context = parsePaysaveClaims(data.claims);
    } catch {
      console.error("AUTH_CONTEXT_PARSE_FAILED", {
        category: "claims_parse_error",
        correlationId,
      });
      context = null;
    }
  }

  const destination = resolveSessionRedirect(request.nextUrl.pathname, context);
  return destination
    ? createRedirectResponse(request, supabaseResponse, destination)
    : supabaseResponse;
}
