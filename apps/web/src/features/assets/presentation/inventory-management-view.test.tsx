import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Asset } from "../domain/entities/asset";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import {
  applyInventorySaveResult,
  InventoryManagementView,
  type InventorySaveAction,
} from "./inventory-management-view";

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
    const saveAction: InventorySaveAction = vi.fn();
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, {
        model,
        assets: [asset],
        canManage: false,
        saveAction,
      }),
    );

    expect(html).toContain("INV-001");
    expect(html).toContain("เปิดรายละเอียด");
    expect(html).not.toContain("แก้ไข Inventory");
  });

  it("shows the edit control when assets.manage is present", () => {
    const saveAction: InventorySaveAction = vi.fn();
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, {
        model,
        assets: [asset],
        canManage: true,
        saveAction,
      }),
    );

    expect(html).toContain("แก้ไข Inventory");
  });

  it("uses a functional row update so overlapping saves cannot restore stale titles", () => {
    const source = readFileSync(
      new URL("./inventory-management-view.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(
      /setRows\(\(current\)\s*=>\s*applyInventorySaveResult\(current,\s*assetId,\s*result\)\.rows\)/,
    );
  });

  it("submits the database-confirmed version as expectedVersionNo", () => {
    const source = readFileSync(
      new URL("./inventory-management-view.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toMatch(/expectedVersionNo:\s*currentAsset\.versionNo/);
  });

  it("refreshes and reconciles rows after a failed save so a conflict can be retried", () => {
    const source = readFileSync(
      new URL("./inventory-management-view.tsx", import.meta.url),
      "utf8",
    );

    expect(source).toContain("const router = useRouter()");
    expect(source).toMatch(/useEffect\(\(\) => setRows\(assets\), \[assets\]\)/);
    expect(source).toMatch(/if \(!result\.ok\) \{\s*router\.refresh\(\)/);
  });

  it("renders a continuation link when another tenant-scoped page exists", () => {
    const saveAction: InventorySaveAction = vi.fn();
    const html = renderToStaticMarkup(
      createElement(InventoryManagementView, {
        model,
        assets: [asset],
        canManage: true,
        nextCursor: "cursor-2",
        saveAction,
      }),
    );

    expect(html).toContain('href="/inventory?cursor=cursor-2"');
    expect(html).toContain("ดูรายการถัดไป");
  });
});

describe("applyInventorySaveResult", () => {
  it("replaces the saved row and exposes success beside the edited asset", () => {
    const updated = {
      ...asset,
      displayRef: "INV-001-TEST",
      versionNo: 2,
      updatedAt: "2026-08-05T13:45:00.000Z",
    };

    expect(
      applyInventorySaveResult([asset], asset.id, {
        ok: true,
        asset: updated,
        message: "บันทึก Inventory เรียบร้อย",
        correlationId: "save-1",
      }),
    ).toEqual({
      rows: [updated],
      notice: {
        assetId: asset.id,
        kind: "success",
        text: "บันทึก Inventory เรียบร้อย (รหัสอ้างอิง: save-1)",
      },
    });
  });

  it("keeps the existing row and exposes a server error beside the edit form", () => {
    expect(
      applyInventorySaveResult([asset], asset.id, {
        ok: false,
        message: "Request validation failed",
        correlationId: "save-2",
      }),
    ).toEqual({
      rows: [asset],
      notice: {
        assetId: asset.id,
        kind: "error",
        text: "Request validation failed (รหัสอ้างอิง: save-2)",
      },
    });
  });
});
