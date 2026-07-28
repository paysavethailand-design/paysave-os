import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { actor, requireApiPermission, getAssetTimelineUseCase } = vi.hoisted(() => {
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
    getAssetTimelineUseCase: vi.fn(),
  };
});

vi.mock("@/features/auth/server", () => ({ requireApiPermission }));
vi.mock("@/features/assets/server", () => ({
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
  getAssetTimelineUseCase,
}));

import { GET } from "./route";

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getAssetTimelineUseCase.mockReset().mockResolvedValue([
    {
      status: "received",
      user: "u1",
      dateTime: "2026-07-24T00:00:00.000Z",
      action: "asset.received",
    },
  ]);
});

describe("GET /api/v1/assets/[assetId]/history", () => {
  it("requires assets.read and returns an uncached tenant-scoped timeline", async () => {
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/assets/a1/history?partnerId=p1"),
      { params: Promise.resolve({ assetId: "a1" }) },
    );

    expect(requireApiPermission).toHaveBeenCalledWith("assets.read");
    expect(getAssetTimelineUseCase).toHaveBeenCalledWith("a1", "p1", actor);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect((await response.json()).data[0]).toMatchObject({
      status: "received",
      action: "asset.received",
    });
  });
});
