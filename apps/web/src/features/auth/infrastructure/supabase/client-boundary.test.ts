import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname);
const read = (name: string) => readFileSync(resolve(root, name), "utf8");

describe("Supabase client module boundaries", () => {
  it("injects the authenticated server client at the dashboard composition boundary", () => {
    const repository = read(
      "../../../frontend-dashboard/infrastructure/supabase/supabase-dashboard-repository.ts",
    );
    const composition = read("../../../frontend-dashboard/composition.tsx");
    const page = read("../../../../app/dashboard/[persona]/page.tsx");

    expect(repository).toContain("private readonly client: SupabaseClient");
    expect(repository).not.toContain("@/shared/supabase/browser-client");
    expect(repository).not.toContain("auth/infrastructure/supabase/server-client");
    expect(repository).not.toContain("get-auth-context");
    expect(composition).not.toContain("@/features/auth/server");
    expect(composition).toContain("new SupabaseDashboardRepository(client)");
    expect(page).toContain("createAuthServerClient");
    expect(page).toContain("<FrontendDashboardPage client={client} persona={persona} />");
  });

  it("keeps browser-client free from Server Component APIs", () => {
    const browserClient = read("../../../../shared/supabase/browser-client.ts");
    expect(browserClient).toContain("createBrowserClient");
    expect(browserClient).not.toContain("next/headers");
  });

  it("keeps next/headers isolated in an explicitly server-only module", () => {
    const serverClient = read("server-client.ts");
    expect(serverClient).toContain('import "server-only"');
    expect(serverClient).toContain('from "next/headers"');
    expect(serverClient).toContain("createServerClient");
  });
});
