import { describe, expect, it } from "vitest";
import {
  buildCorsHeaders,
  buildSecurityHeaderValues,
  isCorsOriginAllowed,
} from "./response-security";

describe("response security policy", () => {
  it("builds a nonce-bound production CSP and hardened browser headers", () => {
    const headers = buildSecurityHeaderValues({
      nonce: "abc123",
      production: true,
      supabaseUrl: "https://project.supabase.co",
    });

    expect(headers["Content-Security-Policy"]).toContain("script-src 'self' 'nonce-abc123'");
    expect(headers["Content-Security-Policy"]).toContain(
      "connect-src 'self' https://project.supabase.co",
    );
    expect(headers["Content-Security-Policy"]).toContain("upgrade-insecure-requests");
    expect(headers["Content-Security-Policy"]).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains; preload",
    );
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("omits HSTS and upgrade directives outside production", () => {
    const headers = buildSecurityHeaderValues({ nonce: "n", production: false });
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
  });

  it("allows only exact configured CORS origins", () => {
    const allowed = "https://app.paysave.co.th,https://admin.paysave.co.th";
    expect(isCorsOriginAllowed("https://app.paysave.co.th", allowed)).toBe(true);
    expect(isCorsOriginAllowed("https://evil.example", allowed)).toBe(false);
    expect(isCorsOriginAllowed("https://app.paysave.co.th.evil.example", allowed)).toBe(false);
    expect(buildCorsHeaders("https://app.paysave.co.th", allowed)).toEqual({
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Correlation-Id",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Origin": "https://app.paysave.co.th",
      Vary: "Origin",
    });
    expect(buildCorsHeaders("https://evil.example", allowed)).toBeNull();
  });
});
