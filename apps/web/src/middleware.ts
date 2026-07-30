import type { NextRequest } from "next/server";
import { updateSession } from "@/features/auth/server";

/** Refreshes Supabase sessions and protects application routes with real Supabase Auth. */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
