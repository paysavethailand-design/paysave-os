import { type NextRequest, NextResponse } from "next/server";
import {
  createAuthServerClient,
  getAuthenticatedLandingRoute,
  getAuthContextFromClient,
} from "@/features/auth/server";

/** Exchanges a Supabase PKCE authorization code for a secure cookie-backed session. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createAuthServerClient({ cookieWriteMode: "required" });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const context = await getAuthContextFromClient(supabase);
      if (context) {
        const landingRoute = getAuthenticatedLandingRoute(context.roles);
        return NextResponse.redirect(new URL(landingRoute, request.url));
      }
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=callback", request.url));
}
