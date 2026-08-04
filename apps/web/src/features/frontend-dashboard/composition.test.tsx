import type { SupabaseClient } from "@supabase/supabase-js";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { constructorSpy, getDashboard } = vi.hoisted(() => ({
  constructorSpy: vi.fn(),
  getDashboard: vi.fn(),
}));

vi.mock("./infrastructure/supabase/supabase-dashboard-repository", () => ({
  SupabaseDashboardRepository: class {
    constructor(client: SupabaseClient) {
      constructorSpy(client);
    }

    getDashboard = getDashboard;
  },
}));
vi.mock("./presentation/dashboard-view", () => ({
  DashboardView: ({ model }: { readonly model: { readonly title: string } }) =>
    createElement("div", null, model.title),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

import { FrontendDashboardPage } from "./composition";

const model = {
  source: "live" as const,
  persona: "admin" as const,
  eyebrow: "ADMIN",
  title: "Admin dashboard",
  description: "Ready",
  kpis: [],
  trend: [],
  distribution: [],
  activity: [],
};

describe("FrontendDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the admin dashboard through the authenticated server client", async () => {
    const authenticatedClient = {} as SupabaseClient;
    getDashboard.mockResolvedValue(model);

    const rendered = await FrontendDashboardPage({
      canViewInventory: true,
      client: authenticatedClient,
      persona: "admin",
    });

    expect(constructorSpy).toHaveBeenCalledWith(authenticatedClient);
    expect(getDashboard).toHaveBeenCalledWith("admin");
    expect(rendered.props.canViewInventory).toBe(true);
  });
});
