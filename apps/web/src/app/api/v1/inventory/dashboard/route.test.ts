import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { actor, requireApiPermission, getInventoryDashboardUseCase } = vi.hoisted(() => {
  const actor = {
    userId: "u1",
    activePartnerId: "p1",
    roles: ["admin"],
    permissions: ["assets.read"],
    tenantScope: "active" as const,
    sessionVersion: 1,
  };
  return {
    actor,
    requireApiPermission: vi.fn().mockResolvedValue(actor),
    getInventoryDashboardUseCase: vi.fn(),
  };
});

vi.mock("@/features/auth/server", () => ({ requireApiPermission }));
vi.mock("@/features/assets/server", () => ({
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
  getInventoryDashboardUseCase,
}));

import { GET } from "./route";

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getInventoryDashboardUseCase.mockReset().mockResolvedValue({ inventory: {}, sales: {} });
});

describe("GET /api/v1/inventory/dashboard", () => {
  it("requires assets.read and returns an uncached projection", async () => {
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/inventory/dashboard?partnerId=p1"),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("assets.read");
    expect(getInventoryDashboardUseCase).toHaveBeenCalledWith("p1", actor);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
