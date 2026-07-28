import type { AuthContext } from "@paysave/security";
import { describe, expect, it } from "vitest";
import type { InventoryAnalyticsRepository } from "../ports/inventory-analytics-repository";
import { getAssetTimeline } from "./get-asset-timeline";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: partnerId,
  roles: ["admin"],
  permissions: ["assets.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

function repository(
  timeline: Awaited<ReturnType<InventoryAnalyticsRepository["listTimeline"]>>,
): InventoryAnalyticsRepository {
  return {
    loadSnapshot: async () => ({ assets: [], events: [], assetTypes: [] }),
    listTimeline: async () => timeline,
  };
}

describe("getAssetTimeline", () => {
  it("returns the immutable timeline", async () => {
    const timeline = [
      {
        status: "sold",
        user: actor.userId,
        dateTime: "2026-07-24T08:00:00.000Z",
        action: "sale_completed",
        fromStatus: "ready_for_sale",
      },
    ];

    await expect(getAssetTimeline("asset-1", null, actor, repository(timeline))).resolves.toEqual(
      timeline,
    );
  });

  it("returns not_found when the tenant-scoped asset is missing", async () => {
    await expect(getAssetTimeline("missing", null, actor, repository(null))).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
