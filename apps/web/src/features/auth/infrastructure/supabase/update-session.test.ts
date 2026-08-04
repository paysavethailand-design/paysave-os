import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClientMock, getClaimsMock, parsePaysaveClaimsMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
  getClaimsMock: vi.fn(),
  parsePaysaveClaimsMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: createServerClientMock }));
vi.mock("@paysave/security", async (importOriginal) => {
  const original = await importOriginal<typeof import("@paysave/security")>();
  return { ...original, parsePaysaveClaims: parsePaysaveClaimsMock };
});
vi.mock("@/shared/config", () => ({
  getPublicEnvironment: () => ({
    supabaseUrl: "https://staging-project.example.invalid",
    supabasePublishableKey: "publishable-key-placeholder",
  }),
  getServerEnvironment: () => ({ enableDesignPreview: false }),
}));

import { updateSession } from "./update-session";

interface CookieAdapter {
  readonly setAll: (
    cookies: ReadonlyArray<{
      readonly name: string;
      readonly value: string;
      readonly options?: { readonly httpOnly?: boolean };
    }>,
  ) => void;
}

function request(pathname: string): NextRequest {
  return new NextRequest(`https://preview.example.invalid${pathname}`);
}

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClaimsMock.mockResolvedValue({ data: { claims: null }, error: null });
    parsePaysaveClaimsMock.mockReturnValue({
      userId: "00000000-0000-4000-8000-000000000001",
      activePartnerId: "RC_STAGING",
      roles: ["admin"],
      permissions: [],
      sessionVersion: 1,
    });
    createServerClientMock.mockImplementation(
      (_url: string, _key: string, options: { readonly cookies: CookieAdapter }) => ({
        auth: {
          getClaims: async () => {
            const result = await getClaimsMock();
            if (result.data?.claims) {
              options.cookies.setAll([
                {
                  name: "sb-session-placeholder",
                  value: "opaque-session-placeholder",
                  options: { httpOnly: true },
                },
              ]);
            }
            return result;
          },
        },
      }),
    );
  });

  it("redirects the unauthenticated legacy login alias to the clean canonical route", async () => {
    const response = await updateSession(request("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://preview.example.invalid/sign-in");
  });

  it("adds only the local protected pathname as a safe next target", async () => {
    const response = await updateSession(request("/dashboard/admin?source=external"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/sign-in?next=%2Fdashboard%2Fadmin",
    );
  });

  it("redirects an authenticated admin away from sign-in and propagates refreshed cookies", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "pilot" } }, error: null });

    const response = await updateSession(request("/sign-in"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
    expect(response.headers.get("set-cookie")).toContain("sb-session-placeholder=");
  });

  it("keeps an authenticated dashboard refresh on the same route", async () => {
    getClaimsMock.mockResolvedValue({ data: { claims: { sub: "pilot" } }, error: null });

    const response = await updateSession(request("/dashboard/admin"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("set-cookie")).toContain("sb-session-placeholder=");
  });
});
