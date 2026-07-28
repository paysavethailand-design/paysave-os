import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/features/auth/server";
import { isMockFrontendPath } from "@/features/frontend-dashboard/server";

/** Refreshes Supabase sessions and protects application routes. */
export async function middleware(request: NextRequest) {
  if (isMockFrontendPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
