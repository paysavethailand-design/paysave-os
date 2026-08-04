import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  createAuthServerClientMock,
  exchangeCodeForSessionMock,
  getAuthenticatedLandingRouteMock,
  getAuthContextFromClientMock,
} = vi.hoisted(() => ({
  createAuthServerClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
  getAuthenticatedLandingRouteMock: vi.fn(),
  getAuthContextFromClientMock: vi.fn(),
}));

vi.mock("@/features/auth/server", () => ({
  createAuthServerClient: createAuthServerClientMock,
  getAuthenticatedLandingRoute: getAuthenticatedLandingRouteMock,
  getAuthContextFromClient: getAuthContextFromClientMock,
}));

import { GET } from "./route";

function request(query: string): NextRequest {
  return new NextRequest(`https://preview.example.invalid/auth/callback${query}`);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createAuthServerClientMock.mockResolvedValue({
      auth: { exchangeCodeForSession: exchangeCodeForSessionMock },
    });
    exchangeCodeForSessionMock.mockResolvedValue({ error: null });
    getAuthContextFromClientMock.mockResolvedValue({ roles: ["admin"] });
    getAuthenticatedLandingRouteMock.mockReturnValue("/dashboard/admin");
  });

  it("requires cookie persistence and redirects by authenticated role", async () => {
    const response = await GET(request("?code=code-placeholder&next=/dashboard/admin"));

    expect(createAuthServerClientMock).toHaveBeenCalledWith({ cookieWriteMode: "required" });
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("code-placeholder");
    expect(getAuthContextFromClientMock).toHaveBeenCalledWith(
      expect.objectContaining({ auth: expect.any(Object) }),
    );
    expect(getAuthenticatedLandingRouteMock).toHaveBeenCalledWith(["admin"]);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
  });

  it("ignores an external callback destination", async () => {
    const response = await GET(
      request("?code=code-placeholder&next=https://attacker.example.invalid"),
    );

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
  });

  it("ignores a backslash network-path callback destination", async () => {
    const response = await GET(request("?code=code-placeholder&next=/%5Cattacker.example.invalid"));

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
  });

  it("ignores a legacy admin next path and uses the authenticated role landing", async () => {
    const response = await GET(request("?code=code-placeholder&next=/admin"));

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
  });

  it("fails closed when callback claims cannot be resolved", async () => {
    getAuthContextFromClientMock.mockResolvedValue(null);

    const response = await GET(request("?code=code-placeholder&next=/admin"));

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/sign-in?error=callback",
    );
  });

  it("returns to canonical sign-in when the code exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: new Error("exchange_failed") });

    const response = await GET(request("?code=code-placeholder"));

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/sign-in?error=callback",
    );
  });
});
