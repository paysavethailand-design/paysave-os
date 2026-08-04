import { type NextRequest, NextResponse } from "next/server";
import { createAuthServerClient, getSafeRedirectPath } from "@/features/auth/server";

/** Exchanges a Supabase PKCE authorization code for a secure cookie-backed session. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = getSafeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createAuthServerClient({ cookieWriteMode: "required" });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  return NextResponse.redirect(new URL("/sign-in?error=callback", request.url));
}
