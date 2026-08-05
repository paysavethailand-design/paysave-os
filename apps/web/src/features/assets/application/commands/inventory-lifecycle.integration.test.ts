import { RecordingAuditSink } from "@paysave/observability";
import type { AuthContext } from "@paysave/security";
import { describe, expect, it } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository, AssetStatusTransition } from "../ports/asset-repository";
import { projectInventoryDashboard } from "../queries/project-inventory-dashboard";
import { changeAssetStatus } from "./change-asset-status";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: partnerId,
  roles: ["admin"],
  permissions: ["assets.manage", "assets.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

class LifecycleRepository implements AssetRepository {
  asset: Asset = {
    id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
    partnerId,
    assetTypeId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
    businessObjectId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
    displayRef: "Inventory device",
    currentStatusCode: "received",
    currentOwnerCustomerId: "buyer-1",
    versionNo: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
  readonly history: AssetStatusTransition[] = [];
  async list() {
    return [this.asset];
  }
  async findById() {
    return this.asset;
  }
  async assetTypeExists() {
    return true;
  }
  async create() {
    return this.asset;
  }
  async update() {
    return { ok: true as const, asset: this.asset, rowsAffected: 1 as const };
  }
  async changeStatus(_assetId: string, transition: AssetStatusTransition) {
    this.history.push(transition);
    this.asset = {
      ...this.asset,
      currentStatusCode: transition.toStatusCode,
      versionNo: transition.previousVersionNo + 1,
      updatedAt: transition.changedAt,
    };
    return this.asset;
  }
}

describe("inventory lifecycle integration", () => {
  it("executes received to closed with immutable history, one audit per transition, and matching dashboard", async () => {
    const repository = new LifecycleRepository();
    const auditSink = new RecordingAuditSink();
    let minute = 0;
    const clock = {
      now: () => new Date(`2026-07-24T08:${String(minute++).padStart(2, "0")}:00.000Z`),
    };

    for (const [toStatusCode, reasonCode] of [
      ["ready_for_sale", "inspection_completed"],
      ["sold", "sale_completed"],
      ["delivered", "delivery_confirmed"],
      ["closed", "lifecycle_closed"],
    ] as const) {
      await changeAssetStatus(
        repository.asset.id,
        { toStatusCode, reasonCode },
        { actor, correlationId: `c-${toStatusCode}` },
        { repository, auditSink, clock },
      );
    }

    expect(repository.asset.currentStatusCode).toBe("closed");
    expect(repository.history.map((event) => event.toStatusCode)).toEqual([
      "ready_for_sale",
      "sold",
      "delivered",
      "closed",
    ]);
    expect(auditSink.all()).toHaveLength(4);
    expect(auditSink.all().every((event) => event.action === "asset.status.change")).toBe(true);

    const dashboard = projectInventoryDashboard({
      assets: [
        {
          id: repository.asset.id,
          currentStatusCode: repository.asset.currentStatusCode,
          createdAt: repository.asset.createdAt,
          assetTypeId: repository.asset.assetTypeId,
          buyerId: repository.asset.currentOwnerCustomerId,
        },
      ],
      events: repository.history.map((event) => ({
        assetId: repository.asset.id,
        toStatusCode: event.toStatusCode,
        changedAt: event.changedAt,
        changedBy: event.changedBy,
      })),
      assetTypes: [{ id: repository.asset.assetTypeId, label: "iPhone" }],
      now: new Date("2026-07-24T09:00:00.000Z"),
    });

    expect(dashboard.inventory).toMatchObject({ totalStock: 0, soldToday: 1 });
    expect(dashboard.sales).toMatchObject({ dailySales: 1, monthlySales: 1 });
    expect(dashboard.sales.byBrand).toEqual([{ label: "iPhone", count: 1 }]);
    expect(dashboard.sales.byBuyer).toEqual([{ label: "buyer-1", count: 1 }]);
    expect(dashboard.sales.byEmployee).toEqual([{ label: actor.userId, count: 1 }]);
  });
});
