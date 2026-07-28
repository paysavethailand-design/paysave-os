/** Identifies mock-only frontend routes that must never invoke live auth or data services. */
export function isMockFrontendPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/dashboard/") ||
    pathname.startsWith("/recovery/")
  );
}
