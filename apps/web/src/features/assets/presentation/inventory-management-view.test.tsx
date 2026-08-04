import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Asset } from "../domain/entities/asset";
import { InventoryManagementView, saveInventoryAsset } from "./inventory-management-view";

const asset: Asset = {
  id: "a1",
  partnerId: "tenant-a",
  assetTypeId: "type-1",
  businessObjectId: "business-1",
  displayRef: "INV-001",
  currentStatusCode: "ready_for_sale",
  currentOwnerCustomerId: null,
  versionNo: 1,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

const model = {
  generatedAt: "2026-08-04T00:00:00.000Z",
  inventory: {
    totalStock: 1,
    readyForSale: 1,
    reserved: 0,
    soldToday: 0,
    deadStock: 0,
    aging: [],
  },
  sales: { dailySales: 0, monthlySales: 0, byBrand: [], byBuyer: [], byEmployee: [] },
  assets: [],
  events: [],
  assetTypes: [],
} as const;

describe("InventoryManagementView", () => {
  it("renders list and detail controls but hides edit without assets.manage", () => {
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, { model, assets: [asset], canManage: false }),
    );

    expect(html).toContain("INV-001");
    expect(html).toContain("เปิดรายละเอียด");
    expect(html).not.toContain("แก้ไข Inventory");
  });

  it("shows the edit control when assets.manage is present", () => {
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, { model, assets: [asset], canManage: true }),
    );

    expect(html).toContain("แก้ไข Inventory");
  });

  it("renders a continuation link when another tenant-scoped page exists", () => {
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, {
        model,
        assets: [asset],
        canManage: true,
        nextCursor: "cursor-2",
      }),
    );

    expect(html).toContain('href="/inventory?cursor=cursor-2"');
    expect(html).toContain("ดูรายการถัดไป");
  });
});

describe("saveInventoryAsset", () => {
  it("saves through the existing assets.manage PATCH endpoint", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { ...asset, displayRef: "INV-001-EDITED" } }),
    });

    await expect(saveInventoryAsset("a1", "INV-001-EDITED", fetcher)).resolves.toMatchObject({
      displayRef: "INV-001-EDITED",
    });
    expect(fetcher).toHaveBeenCalledWith("/api/v1/assets/a1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayRef: "INV-001-EDITED" }),
    });
  });
});
