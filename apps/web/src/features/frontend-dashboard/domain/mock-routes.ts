/** @deprecated Mock-only frontend routes. Login and dashboards now use real Supabase Auth and live data. Middleware no longer bypasses auth for these paths. */
export function isMockFrontendPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/recovery/")
  );
}
