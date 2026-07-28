import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseInventoryAnalyticsRepository } from "./supabase-inventory-analytics-repository";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const assetId = "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444";

function repositoryWith(
  responses: ReadonlyArray<{ data: unknown; error: { message: string } | null }>,
) {
  const client = new FakeSupabaseClient(responses);
  return {
    client,
    repository: new SupabaseInventoryAnalyticsRepository(client as unknown as SupabaseClient),
  };
}

describe("SupabaseInventoryAnalyticsRepository", () => {
  it("loads tenant-scoped source rows for the dashboard", async () => {
    const { repository, client } = repositoryWith([
      {
        data: [
          {
            id: assetId,
            asset_type_id: "type-1",
            current_status_code: "sold",
            current_owner_customer_id: "buyer-1",
            created_at: "2026-07-01T00:00:00.000Z",
          },
        ],
        error: null,
      },
      {
        data: [
          {
            asset_id: assetId,
            to_status_code: "sold",
            changed_at: "2026-07-24T08:00:00.000Z",
            changed_by: "employee-1",
          },
        ],
        error: null,
      },
      { data: [{ id: "type-1", code: "IPHONE", name: "iPhone" }], error: null },
    ]);

    const snapshot = await repository.loadSnapshot(partnerId);

    expect(snapshot.assets[0]).toMatchObject({ id: assetId, buyerId: "buyer-1" });
    expect(snapshot.events[0]).toMatchObject({ assetId, changedBy: "employee-1" });
    expect(snapshot.assetTypes).toEqual([{ id: "type-1", label: "iPhone" }]);
    for (const builder of client.recordedBuilders()) {
      expect(builder.recordedCalls()).toContainEqual({
        method: "eq",
        args: ["partner_id", partnerId],
      });
      expect(builder.recordedCalls()).toContainEqual({ method: "range", args: [0, 999] });
    }
  });

  it("returns creation plus immutable transitions in chronological order", async () => {
    const { repository } = repositoryWith([
      {
        data: {
          id: assetId,
          current_status_code: "sold",
          created_at: "2026-07-20T01:00:00.000Z",
          created_by: "receiver-1",
        },
        error: null,
      },
      {
        data: [
          {
            from_status_code: "ready_for_sale",
            to_status_code: "sold",
            changed_at: "2026-07-24T08:00:00.000Z",
            changed_by: "seller-1",
            reason_code: "sale_completed",
          },
          {
            from_status_code: "received",
            to_status_code: "ready_for_sale",
            changed_at: "2026-07-21T08:00:00.000Z",
            changed_by: "inspector-1",
            reason_code: "inspection_passed",
          },
        ],
        error: null,
      },
    ]);

    await expect(repository.listTimeline(partnerId, assetId)).resolves.toEqual([
      {
        status: "received",
        user: "receiver-1",
        dateTime: "2026-07-20T01:00:00.000Z",
        action: "asset.received",
        fromStatus: null,
      },
      {
        status: "ready_for_sale",
        user: "inspector-1",
        dateTime: "2026-07-21T08:00:00.000Z",
        action: "inspection_passed",
        fromStatus: "received",
      },
      {
        status: "sold",
        user: "seller-1",
        dateTime: "2026-07-24T08:00:00.000Z",
        action: "sale_completed",
        fromStatus: "ready_for_sale",
      },
    ]);
  });

  it("returns null when the asset is not visible in tenant scope", async () => {
    const { repository } = repositoryWith([{ data: null, error: null }]);
    await expect(repository.listTimeline(partnerId, "missing")).resolves.toBeNull();
  });
});
