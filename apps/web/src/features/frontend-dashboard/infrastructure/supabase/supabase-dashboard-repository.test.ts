import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("@paysave/security", async () => {
  const actual = await vi.importActual<typeof import("@paysave/security")>("@paysave/security");
  return {
    ...actual,
    parsePaysaveClaims: vi.fn(() => ({
      userId: "pilot",
      activePartnerId: "RC_STAGING",
      roles: ["admin"],
      permissions: [],
      tenantScope: "active",
      sessionVersion: 1,
    })),
  };
});

import { SupabaseDashboardRepository } from "./supabase-dashboard-repository";

function dashboardClient() {
  const abortSignals: AbortSignal[] = [];
  const builder = {
    from: vi.fn(() => builder),
    select: vi.fn(() => builder),
    is: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    abortSignal: vi.fn((signal: AbortSignal) => {
      abortSignals.push(signal);
      return builder;
    }),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ count: 0, data: [], error: null }).then(resolve),
  };

  const client = {
    auth: {
      getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: "pilot" } }, error: null }),
    },
    schema: vi.fn(() => builder),
  } as unknown as SupabaseClient;

  return { abortSignals, client };
}

describe("SupabaseDashboardRepository", () => {
  it("bounds every live dashboard request so a pending backend cannot stall the page", async () => {
    const { abortSignals, client } = dashboardClient();

    const model = await new SupabaseDashboardRepository(client).getDashboard("admin");

    expect(model.persona).toBe("admin");
    expect(abortSignals).toHaveLength(4);
    expect(abortSignals.every((signal) => signal instanceof AbortSignal)).toBe(true);
  });
});
