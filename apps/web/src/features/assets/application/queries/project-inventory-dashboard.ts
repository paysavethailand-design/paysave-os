import { INVENTORY_STATUS } from "../../domain/inventory-lifecycle";

export interface InventoryAssetSnapshot {
  readonly id: string;
  readonly currentStatusCode: string;
  readonly createdAt: string;
  readonly assetTypeId: string;
  readonly buyerId: string | null;
}

export interface InventoryStatusEvent {
  readonly assetId: string;
  readonly toStatusCode: string;
  readonly changedAt: string;
  readonly changedBy: string | null;
}

export interface AssetTypeDimension {
  readonly id: string;
  readonly label: string;
}

export interface CountDimension {
  readonly label: string;
  readonly count: number;
}

export interface InventoryDashboardModel {
  readonly generatedAt: string;
  readonly inventory: {
    readonly totalStock: number;
    readonly readyForSale: number;
    readonly reserved: number;
    readonly soldToday: number;
    readonly deadStock: number;
    readonly aging: readonly {
      readonly bucket: "0-30" | "31-60" | "61-90" | "90+";
      readonly count: number;
    }[];
  };
  readonly sales: {
    readonly dailySales: number;
    readonly monthlySales: number;
    readonly byBrand: readonly CountDimension[];
    readonly byBuyer: readonly CountDimension[];
    readonly byEmployee: readonly CountDimension[];
  };
}

interface ProjectionInput {
  readonly assets: readonly InventoryAssetSnapshot[];
  readonly events: readonly InventoryStatusEvent[];
  readonly assetTypes: readonly AssetTypeDimension[];
  readonly now: Date;
}

const CLOSED_STOCK_STATUSES = new Set<string>([
  INVENTORY_STATUS.SOLD,
  INVENTORY_STATUS.DELIVERED,
  INVENTORY_STATUS.CLOSED,
  "retired",
]);
const DAY_MS = 86_400_000;

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function utcMonthStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function countBy(labels: readonly string[]): readonly CountDimension[] {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function agingBucket(ageDays: number): "0-30" | "31-60" | "61-90" | "90+" {
  if (ageDays <= 30) return "0-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays < 90) return "61-90";
  return "90+";
}

/** Pure, read-only projection. All figures are derived from current asset rows and sold history. */
export function projectInventoryDashboard(input: ProjectionInput): InventoryDashboardModel {
  const nowMs = input.now.getTime();
  const dayStart = utcDayStart(input.now);
  const monthStart = utcMonthStart(input.now);
  const nextMonthStart = Date.UTC(input.now.getUTCFullYear(), input.now.getUTCMonth() + 1, 1);
  const assetsById = new Map(input.assets.map((asset) => [asset.id, asset]));
  const typeLabels = new Map(input.assetTypes.map((type) => [type.id, type.label]));
  const openAssets = input.assets.filter(
    (asset) => !CLOSED_STOCK_STATUSES.has(asset.currentStatusCode),
  );

  const uniqueSoldEvents = [
    ...new Map(
      input.events
        .filter((event) => event.toStatusCode === INVENTORY_STATUS.SOLD)
        .map((event) => [`${event.assetId}:${event.changedAt}`, event]),
    ).values(),
  ];
  const todaySales = uniqueSoldEvents.filter((event) => {
    const changedAt = Date.parse(event.changedAt);
    return changedAt >= dayStart && changedAt <= nowMs;
  });
  const monthSales = uniqueSoldEvents.filter((event) => {
    const changedAt = Date.parse(event.changedAt);
    return changedAt >= monthStart && changedAt < nextMonthStart && changedAt <= nowMs;
  });

  const agingCounts = new Map<string, number>([
    ["0-30", 0],
    ["31-60", 0],
    ["61-90", 0],
    ["90+", 0],
  ]);
  for (const asset of openAssets) {
    const ageDays = Math.max(0, Math.floor((nowMs - Date.parse(asset.createdAt)) / DAY_MS));
    const bucket = agingBucket(ageDays);
    agingCounts.set(bucket, (agingCounts.get(bucket) ?? 0) + 1);
  }

  return {
    generatedAt: input.now.toISOString(),
    inventory: {
      totalStock: openAssets.length,
      readyForSale: input.assets.filter(
        (asset) => asset.currentStatusCode === INVENTORY_STATUS.READY_FOR_SALE,
      ).length,
      reserved: input.assets.filter(
        (asset) => asset.currentStatusCode === INVENTORY_STATUS.RESERVED,
      ).length,
      soldToday: todaySales.length,
      deadStock: openAssets.filter(
        (asset) => Math.floor((nowMs - Date.parse(asset.createdAt)) / DAY_MS) >= 90,
      ).length,
      aging: (["0-30", "31-60", "61-90", "90+"] as const).map((bucket) => ({
        bucket,
        count: agingCounts.get(bucket) ?? 0,
      })),
    },
    sales: {
      dailySales: todaySales.length,
      monthlySales: monthSales.length,
      byBrand: countBy(
        monthSales.map((event) => {
          const asset = assetsById.get(event.assetId);
          return asset ? (typeLabels.get(asset.assetTypeId) ?? asset.assetTypeId) : "ไม่ระบุ";
        }),
      ),
      byBuyer: countBy(
        monthSales.map((event) => assetsById.get(event.assetId)?.buyerId ?? "ไม่ระบุ"),
      ),
      byEmployee: countBy(monthSales.map((event) => event.changedBy ?? "ไม่ระบุ")),
    },
  };
}
