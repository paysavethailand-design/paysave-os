import { describe, expect, it, vi } from "vitest";
import { checkSupabaseDependencies } from "./dependencies";

const environment = {
  NODE_ENV: "test",
  NEXT_PUBLIC_SUPABASE_URL: "https://staging-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staging_placeholder",
} as NodeJS.ProcessEnv;

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

describe("readyz dependency probes", () => {
  it("checks database, auth, and storage without privileged credentials", async () => {
    const fetcher = vi.fn<Fetcher>(async () => new Response("{}", { status: 200 }));

    const checks = await checkSupabaseDependencies(environment, { fetcher, timeoutMs: 100 });

    expect(checks).toEqual([
      { name: "database_dependency", ok: true },
      { name: "auth_dependency", ok: true },
      { name: "storage_dependency", ok: true },
    ]);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.map(([url]) => String(url))).toEqual([
      "https://staging-project.supabase.co/rest/v1/roles?select=id&limit=1",
      "https://staging-project.supabase.co/auth/v1/health",
      "https://staging-project.supabase.co/storage/v1/status",
    ]);
    expect(fetcher.mock.calls[0]?.[1]?.headers).toMatchObject({
      "Accept-Profile": "iam",
    });
    for (const [, init] of fetcher.mock.calls) {
      expect(init?.headers).toMatchObject({
        apikey: environment["NEXT_PUBLIC_" + "SUPABASE_PUBLISHABLE_KEY"],
      });
    }
  });

  it("accepts an expected database permission denial as proof of a live DB-backed PostgREST path", async () => {
    const fetcher = vi.fn<Fetcher>(async (input: RequestInfo | URL) =>
      String(input).includes("/rest/v1/")
        ? new Response(JSON.stringify({ code: "42501", message: "permission denied" }), {
            status: 401,
          })
        : new Response("{}", { status: 200 }),
    );

    const checks = await checkSupabaseDependencies(environment, { fetcher, timeoutMs: 100 });

    expect(checks).toContainEqual({ name: "database_dependency", ok: true });
  });

  it("does not accept a generic gateway 401 as database readiness", async () => {
    const fetcher = vi.fn<Fetcher>(async (input: RequestInfo | URL) =>
      String(input).includes("/rest/v1/")
        ? new Response(JSON.stringify({ message: "Secret API key required" }), { status: 401 })
        : new Response("{}", { status: 200 }),
    );

    const checks = await checkSupabaseDependencies(environment, { fetcher, timeoutMs: 100 });

    expect(checks).toContainEqual({
      name: "database_dependency",
      ok: false,
      detail: "dependency_unavailable",
    });
  });

  it("fails only the unavailable dependency and returns sanitized details", async () => {
    const fetcher = vi.fn<Fetcher>(async (input: RequestInfo | URL) =>
      String(input).includes("/auth/")
        ? new Response("upstream internals", { status: 503 })
        : new Response("{}", { status: 200 }),
    );

    const checks = await checkSupabaseDependencies(environment, { fetcher, timeoutMs: 100 });

    expect(checks).toContainEqual({
      name: "auth_dependency",
      ok: false,
      detail: "dependency_unavailable",
    });
    expect(JSON.stringify(checks)).not.toContain("upstream internals");
  });
});
