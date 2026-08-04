import { createElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { canAccessDashboard, createAuthServerClient, frontendDashboardPage, redirect, requireAuth } =
  vi.hoisted(() => ({
    canAccessDashboard: vi.fn(),
    createAuthServerClient: vi.fn(),
    frontendDashboardPage: vi.fn(),
    redirect: vi.fn(),
    requireAuth: vi.fn(),
  }));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect,
}));
vi.mock("@/features/auth/server", () => ({
  createAuthServerClient,
  requireAuth,
}));
vi.mock("@/features/frontend-dashboard", () => ({
  canAccessDashboard,
  dashboardPersonas: ["admin"],
  FrontendDashboardPage: frontendDashboardPage,
  isDashboardPersona: (value: string) => value === "admin",
}));

import DashboardPersonaPage, { dynamic } from "./page";

const adminContext = {
  userId: "pilot",
  activePartnerId: "RC_STAGING",
  roles: ["admin"],
  permissions: ["assets.read"],
  tenantScope: "active",
  sessionVersion: 1,
} as const;

describe("DashboardPersonaPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAuth.mockResolvedValue(adminContext);
    canAccessDashboard.mockReturnValue(true);
    frontendDashboardPage.mockReturnValue(createElement("div", null, "Admin dashboard"));
  });

  it("forces request-time rendering for session and cookie-aware authorization", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("renders /dashboard/admin with the authenticated server client for role admin", async () => {
    const authenticatedClient = {};
    createAuthServerClient.mockResolvedValue(authenticatedClient);

    const rendered = (await DashboardPersonaPage({
      params: Promise.resolve({ persona: "admin" }),
    })) as ReactElement<{ canViewInventory: boolean; client: object; persona: string }>;

    expect(requireAuth).toHaveBeenCalledWith("/dashboard/admin");
    expect(canAccessDashboard).toHaveBeenCalledWith("admin", ["admin"]);
    expect(redirect).not.toHaveBeenCalled();
    expect(createAuthServerClient).toHaveBeenCalledWith();
    expect(rendered.type).toBe(frontendDashboardPage);
    expect(rendered.props).toEqual({
      canViewInventory: true,
      client: authenticatedClient,
      persona: "admin",
    });
  });
});
