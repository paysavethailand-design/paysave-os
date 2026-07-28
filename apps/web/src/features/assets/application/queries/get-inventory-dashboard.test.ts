import type { AuthContext } from "@paysave/security";
import { describe, expect, it } from "vitest";
import type { InventoryAnalyticsRepository } from "../ports/inventory-analytics-repository";
import { getInventoryDashboard } from "./get-inventory-dashboard";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: partnerId,
  roles: ["admin"],
  permissions: ["assets.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

function repository(): InventoryAnalyticsRepository {
  return {
    loadSnapshot: async () => ({
      assets: [
        {
          id: "a1",
          currentStatusCode: "ready_for_sale",
          createdAt: "2026-07-01T00:00:00.000Z",
          assetTypeId: "t1",
          buyerId: null,
        },
      ],
      events: [],
      assetTypes: [{ id: "t1", label: "iPhone" }],
    }),
    listTimeline: async () => [],
  };
}

describe("getInventoryDashboard", () => {
  it("resolves tenant scope and projects a read-only dashboard", async () => {
    const dashboard = await getInventoryDashboard(null, actor, repository(), {
      now: () => new Date("2026-07-24T10:00:00.000Z"),
    });

    expect(dashboard.inventory.totalStock).toBe(1);
    expect(dashboard.inventory.readyForSale).toBe(1);
    expect(dashboard.generatedAt).toBe("2026-07-24T10:00:00.000Z");
  });

  it("rejects an unauthorized cross-tenant request", async () => {
    await expect(
      getInventoryDashboard("11111111-1111-4111-8111-111111111111", actor, repository(), {
        now: () => new Date(),
      }),
    ).rejects.toMatchObject({ code: "forbidden" });
  });
});
