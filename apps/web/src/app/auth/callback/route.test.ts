import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createAuthServerClientMock, exchangeCodeForSessionMock } = vi.hoisted(() => ({
  createAuthServerClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn(),
}));

vi.mock("@/features/auth/server", () => ({
  createAuthServerClient: createAuthServerClientMock,
  getSafeRedirectPath: (candidate: string | null) =>
    candidate?.startsWith("/") && !candidate.startsWith("//") && !candidate.includes("\\")
      ? candidate
      : "/",
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
  });

  it("requires cookie persistence when exchanging an authorization code", async () => {
    const response = await GET(request("?code=code-placeholder&next=/dashboard/admin"));

    expect(createAuthServerClientMock).toHaveBeenCalledWith({ cookieWriteMode: "required" });
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith("code-placeholder");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/dashboard/admin",
    );
  });

  it("rejects an external callback destination", async () => {
    const response = await GET(
      request("?code=code-placeholder&next=https://attacker.example.invalid"),
    );

    expect(response.headers.get("location")).toBe("https://preview.example.invalid/");
  });

  it("rejects a backslash network-path callback destination", async () => {
    const response = await GET(request("?code=code-placeholder&next=/%5Cattacker.example.invalid"));

    expect(response.headers.get("location")).toBe("https://preview.example.invalid/");
  });

  it("returns to canonical sign-in when the code exchange fails", async () => {
    exchangeCodeForSessionMock.mockResolvedValue({ error: new Error("exchange_failed") });

    const response = await GET(request("?code=code-placeholder"));

    expect(response.headers.get("location")).toBe(
      "https://preview.example.invalid/sign-in?error=callback",
    );
  });
});
