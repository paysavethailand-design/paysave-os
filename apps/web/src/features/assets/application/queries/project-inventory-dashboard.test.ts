import { describe, expect, it } from "vitest";
import { projectInventoryDashboard } from "./project-inventory-dashboard";

const now = new Date("2026-07-24T10:00:00.000Z");

const assets = [
  {
    id: "a-ready",
    currentStatusCode: "ready_for_sale",
    createdAt: "2026-07-20T00:00:00.000Z",
    assetTypeId: "iphone",
    buyerId: null,
  },
  {
    id: "a-reserved",
    currentStatusCode: "reserved",
    createdAt: "2026-06-10T00:00:00.000Z",
    assetTypeId: "ipad",
    buyerId: "buyer-2",
  },
  {
    id: "a-dead",
    currentStatusCode: "inspection",
    createdAt: "2026-03-01T00:00:00.000Z",
    assetTypeId: "iphone",
    buyerId: null,
  },
  {
    id: "a-sold",
    currentStatusCode: "sold",
    createdAt: "2026-05-01T00:00:00.000Z",
    assetTypeId: "iphone",
    buyerId: "buyer-1",
  },
  {
    id: "a-closed",
    currentStatusCode: "closed",
    createdAt: "2026-01-01T00:00:00.000Z",
    assetTypeId: "ipad",
    buyerId: "buyer-2",
  },
] as const;

const events = [
  {
    assetId: "a-sold",
    toStatusCode: "sold",
    changedAt: "2026-07-24T08:00:00.000Z",
    changedBy: "employee-1",
  },
  {
    assetId: "a-closed",
    toStatusCode: "sold",
    changedAt: "2026-07-02T08:00:00.000Z",
    changedBy: "employee-2",
  },
  {
    assetId: "a-sold",
    toStatusCode: "delivered",
    changedAt: "2026-07-24T09:00:00.000Z",
    changedBy: "employee-1",
  },
  {
    assetId: "a-closed",
    toStatusCode: "sold",
    changedAt: "2026-06-30T08:00:00.000Z",
    changedBy: "employee-2",
  },
] as const;

const assetTypes = [
  { id: "iphone", label: "iPhone" },
  { id: "ipad", label: "iPad" },
] as const;

describe("projectInventoryDashboard", () => {
  it("projects inventory KPIs and aging from authoritative asset state", () => {
    const dashboard = projectInventoryDashboard({ assets, events, assetTypes, now });

    expect(dashboard.inventory).toEqual({
      totalStock: 3,
      readyForSale: 1,
      reserved: 1,
      soldToday: 1,
      deadStock: 1,
      aging: [
        { bucket: "0-30", count: 1 },
        { bucket: "31-60", count: 1 },
        { bucket: "61-90", count: 0 },
        { bucket: "90+", count: 1 },
      ],
    });
  });

  it("projects current-month sales by brand, buyer and employee", () => {
    const dashboard = projectInventoryDashboard({ assets, events, assetTypes, now });

    expect(dashboard.sales.dailySales).toBe(1);
    expect(dashboard.sales.monthlySales).toBe(2);
    expect(dashboard.sales.byBrand).toEqual([
      { label: "iPad", count: 1 },
      { label: "iPhone", count: 1 },
    ]);
    expect(dashboard.sales.byBuyer).toEqual([
      { label: "buyer-1", count: 1 },
      { label: "buyer-2", count: 1 },
    ]);
    expect(dashboard.sales.byEmployee).toEqual([
      { label: "employee-1", count: 1 },
      { label: "employee-2", count: 1 },
    ]);
  });

  it("deduplicates duplicate sold events for the same asset and timestamp", () => {
    const duplicate = [...events, events[0]];
    const dashboard = projectInventoryDashboard({ assets, events: duplicate, assetTypes, now });

    expect(dashboard.sales.dailySales).toBe(1);
    expect(dashboard.sales.monthlySales).toBe(2);
  });
});
