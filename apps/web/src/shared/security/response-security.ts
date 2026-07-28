interface SecurityHeaderOptions {
  nonce: string;
  production: boolean;
  supabaseUrl?: string;
}

type HeaderValues = Record<string, string>;

function safeHttpsOrigin(value?: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(value?: string): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((origin) => safeHttpsOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin)),
  );
}

export function buildSecurityHeaderValues({
  nonce,
  production,
  supabaseUrl,
}: SecurityHeaderOptions): HeaderValues {
  const connectSources = ["'self'"];
  const supabaseOrigin = safeHttpsOrigin(supabaseUrl);
  if (supabaseOrigin) connectSources.push(supabaseOrigin);

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];
  if (production) directives.push("upgrade-insecure-requests");

  const headers: HeaderValues = {
    "Content-Security-Policy": directives.join("; "),
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy":
      "camera=(), display-capture=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
  if (production) {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload";
  }
  return headers;
}

export function isCorsOriginAllowed(origin: string | null, allowedOrigins?: string): boolean {
  const normalized = safeHttpsOrigin(origin ?? undefined);
  return normalized !== null && parseAllowedOrigins(allowedOrigins).has(normalized);
}

export function buildCorsHeaders(
  origin: string | null,
  allowedOrigins?: string,
): HeaderValues | null {
  if (!isCorsOriginAllowed(origin, allowedOrigins) || !origin) return null;
  return {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Correlation-Id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Origin": safeHttpsOrigin(origin)!,
    Vary: "Origin",
  };
}
