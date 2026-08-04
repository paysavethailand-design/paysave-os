import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieStore, cookiesMock, createServerClientMock } = vi.hoisted(() => ({
  cookieStore: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
  cookiesMock: vi.fn(),
  createServerClientMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("@supabase/ssr", () => ({ createServerClient: createServerClientMock }));
vi.mock("@/shared/config", () => ({
  getPublicEnvironment: () => ({
    supabasePublishableKey: "publishable-test-key",
    supabaseUrl: "https://example.supabase.co",
  }),
}));

import { createClient } from "./server-client";

type CookieAdapter = {
  getAll(): unknown[];
  setAll(
    cookies: Array<{
      name: string;
      value: string;
      options: { path: string };
    }>,
  ): void;
};

function capturedCookieAdapter(): CookieAdapter {
  const options = createServerClientMock.mock.calls[0]?.[2] as {
    cookies: CookieAdapter;
  };
  return options.cookies;
}

describe("Supabase server cookie persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookiesMock.mockResolvedValue(cookieStore);
    createServerClientMock.mockReturnValue({ auth: {} });
  });

  it("persists every session cookie through the request cookie store", async () => {
    await createClient({
      correlationId: "request-correlation-1",
      cookieWriteMode: "required",
    });
    capturedCookieAdapter().setAll([
      { name: "sb-session", value: "private-cookie-value", options: { path: "/" } },
    ]);

    expect(cookieStore.set).toHaveBeenCalledWith("sb-session", "private-cookie-value", {
      path: "/",
    });
  });

  it("defers cookie mutation for read-only server auth reads to middleware", async () => {
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await createClient({ correlationId: "request-correlation-read" });

    expect(() =>
      capturedCookieAdapter().setAll([
        { name: "sb-session", value: "private-cookie-value", options: { path: "/" } },
      ]),
    ).not.toThrow();
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledWith("AUTH_COOKIE_WRITE_DEFERRED", {
      category: "middleware_managed_cookie_refresh",
      correlationId: "request-correlation-read",
    });
    expect(JSON.stringify(consoleWarn.mock.calls)).not.toContain("private-cookie-value");
    consoleWarn.mockRestore();
  });

  it("logs only a safe category and correlation id, then surfaces cookie write failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    cookieStore.set.mockImplementation(() => {
      throw new Error("sensitive cookie provider detail");
    });
    await createClient({
      correlationId: "request-correlation-2",
      cookieWriteMode: "required",
    });

    expect(() =>
      capturedCookieAdapter().setAll([
        { name: "sb-session", value: "private-cookie-value", options: { path: "/" } },
      ]),
    ).toThrow("sensitive cookie provider detail");
    expect(consoleError).toHaveBeenCalledWith("AUTH_COOKIE_SET_FAILED", {
      category: "cookie_store_write_error",
      correlationId: "request-correlation-2",
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("private-cookie-value");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(
      "sensitive cookie provider detail",
    );
    consoleError.mockRestore();
  });
});
