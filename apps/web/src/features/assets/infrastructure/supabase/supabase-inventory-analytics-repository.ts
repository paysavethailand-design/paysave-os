import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type {
  AssetTimelineEvent,
  InventoryAnalyticsRepository,
  InventoryAnalyticsSnapshot,
} from "../../application/ports/inventory-analytics-repository";

const SCHEMA = "asset";
const PAGE_SIZE = 1_000;

const assetSnapshotRowSchema = z.object({
  id: z.string(),
  asset_type_id: z.string(),
  current_status_code: z.string(),
  current_owner_customer_id: z.string().nullable(),
  created_at: z.string(),
});
const statusEventRowSchema = z.object({
  asset_id: z.string(),
  to_status_code: z.string(),
  changed_at: z.string(),
  changed_by: z.string().nullable(),
});
const assetTypeRowSchema = z.object({ id: z.string(), code: z.string(), name: z.string() });
const timelineAssetRowSchema = z.object({
  id: z.string(),
  current_status_code: z.string(),
  created_at: z.string(),
  created_by: z.string().nullable(),
});
const timelineRowSchema = z.object({
  from_status_code: z.string(),
  to_status_code: z.string(),
  changed_at: z.string(),
  changed_by: z.string().nullable(),
  reason_code: z.string(),
});

type QueryError = { readonly message: string } | null;

function assertNoError(error: QueryError, context: string): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Supabase/PostgREST read adapter. Every query is tenant-filtered and exhaustively paginated. */
export class SupabaseInventoryAnalyticsRepository implements InventoryAnalyticsRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async loadAll(
    table: string,
    columns: string,
    partnerId: string,
    orderColumn: string,
  ): Promise<readonly unknown[]> {
    const rows: unknown[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await this.client
        .schema(SCHEMA)
        .from(table)
        .select(columns)
        .eq("partner_id", partnerId)
        .order(orderColumn, { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);
      assertNoError(error, `Failed to load ${table}`);
      const page = (data ?? []) as readonly unknown[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  async loadSnapshot(partnerId: string): Promise<InventoryAnalyticsSnapshot> {
    const [assetRows, eventRows, typeRows] = await Promise.all([
      this.loadAll(
        "assets",
        "id, asset_type_id, current_status_code, current_owner_customer_id, created_at",
        partnerId,
        "id",
      ),
      this.loadAll(
        "asset_status_history",
        "asset_id, to_status_code, changed_at, changed_by",
        partnerId,
        "id",
      ),
      this.loadAll("asset_types", "id, code, name", partnerId, "id"),
    ]);

    return {
      assets: assetRows.map((value) => {
        const row = assetSnapshotRowSchema.parse(value);
        return {
          id: row.id,
          currentStatusCode: row.current_status_code,
          createdAt: row.created_at,
          assetTypeId: row.asset_type_id,
          buyerId: row.current_owner_customer_id,
        };
      }),
      events: eventRows.map((value) => {
        const row = statusEventRowSchema.parse(value);
        return {
          assetId: row.asset_id,
          toStatusCode: row.to_status_code,
          changedAt: row.changed_at,
          changedBy: row.changed_by,
        };
      }),
      assetTypes: typeRows.map((value) => {
        const row = assetTypeRowSchema.parse(value);
        return { id: row.id, label: row.name || row.code };
      }),
    };
  }

  async listTimeline(
    partnerId: string,
    assetId: string,
  ): Promise<readonly AssetTimelineEvent[] | null> {
    const { data: assetData, error: assetError } = await this.client
      .schema(SCHEMA)
      .from("assets")
      .select("id, current_status_code, created_at, created_by")
      .eq("partner_id", partnerId)
      .eq("id", assetId)
      .maybeSingle();
    assertNoError(assetError, "Failed to load timeline asset");
    if (!assetData) return null;
    const asset = timelineAssetRowSchema.parse(assetData);

    const { data: historyData, error: historyError } = await this.client
      .schema(SCHEMA)
      .from("asset_status_history")
      .select("from_status_code, to_status_code, changed_at, changed_by, reason_code")
      .eq("partner_id", partnerId)
      .eq("asset_id", assetId)
      .order("changed_at", { ascending: true })
      .range(0, PAGE_SIZE - 1);
    assertNoError(historyError, "Failed to load asset timeline");
    const history = ((historyData ?? []) as readonly unknown[])
      .map((value) => timelineRowSchema.parse(value))
      .sort((left, right) => left.changed_at.localeCompare(right.changed_at));
    const initialStatus = history[0]?.from_status_code ?? asset.current_status_code;

    return [
      {
        status: initialStatus,
        user: asset.created_by,
        dateTime: asset.created_at,
        action: initialStatus === "received" ? "asset.received" : "asset.created",
        fromStatus: null,
      },
      ...history.map((row) => ({
        status: row.to_status_code,
        user: row.changed_by,
        dateTime: row.changed_at,
        action: row.reason_code,
        fromStatus: row.from_status_code,
      })),
    ];
  }
}
