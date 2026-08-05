import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { SupabaseAssetRepository } from "./supabase-asset-repository";

const row = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partner_id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  asset_type_id: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  business_object_id: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
  display_ref: "Toyota Camry - ABC-1234",
  current_status_code: "active",
  current_owner_customer_id: null,
  version_no: 1,
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:00:00.000Z",
};

function repositoryWith(
  responses: ReadonlyArray<{
    data: unknown;
    error: { message: string; code?: string } | null;
    count?: number | null;
  }>,
) {
  const client = new FakeSupabaseClient(responses);
  return { repository: new SupabaseAssetRepository(client as unknown as SupabaseClient), client };
}

describe("SupabaseAssetRepository", () => {
  it("maps a found row to the domain entity", async () => {
    const { repository } = repositoryWith([{ data: row, error: null }]);
    const asset = await repository.findById(row.id);
    expect(asset?.versionNo).toBe(1);
  });

  it("returns true only when the asset type row exists", async () => {
    const { repository } = repositoryWith([{ data: { id: row.asset_type_id }, error: null }]);
    await expect(repository.assetTypeExists(row.partner_id, row.asset_type_id)).resolves.toBe(true);
  });

  it("returns false when the asset type row is missing", async () => {
    const { repository } = repositoryWith([{ data: null, error: null }]);
    await expect(repository.assetTypeExists(row.partner_id, row.asset_type_id)).resolves.toBe(
      false,
    );
  });

  it("updates through the tenant-authorized RPC and returns its database-confirmed row", async () => {
    const updatedRow = { ...row, display_ref: "Toyota Camry - ABC-1234-TEST", version_no: 2 };
    const rpc = vi.fn().mockResolvedValue({ data: [updatedRow], error: null });
    const client = { schema: vi.fn(() => ({ rpc })) };
    const repository = new SupabaseAssetRepository(client as unknown as SupabaseClient);

    await expect(
      repository.update(row.id, row.partner_id, {
        displayRef: "Toyota Camry - ABC-1234-TEST",
        expectedVersionNo: 1,
      }),
    ).resolves.toMatchObject({
      ok: true,
      rowsAffected: 1,
      asset: {
        displayRef: "Toyota Camry - ABC-1234-TEST",
        versionNo: 2,
        updatedAt: updatedRow.updated_at,
      },
    });

    expect(client.schema).toHaveBeenCalledWith("asset");
    expect(rpc).toHaveBeenCalledWith("update_asset_inventory_fields", {
      p_asset_id: row.id,
      p_partner_id: row.partner_id,
      p_expected_version_no: 1,
      p_display_ref: "Toyota Camry - ABC-1234-TEST",
      p_set_current_owner: false,
      p_current_owner_customer_id: null,
    });
  });

  it.each([
    ["PT403", "RLS_OR_PRIVILEGE"],
    ["42501", "RLS_OR_PRIVILEGE"],
    ["PT404", "NOT_FOUND_OR_WRONG_TENANT"],
    ["PT409", "VERSION_CONFLICT"],
    ["23514", "CONSTRAINT_VIOLATION"],
  ] as const)("maps RPC SQLSTATE %s to safe category %s", async (code, category) => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code, message: `sensitive database detail ${row.id} ${row.partner_id}` },
    });
    const repository = new SupabaseAssetRepository({
      schema: vi.fn(() => ({ rpc })),
    } as unknown as SupabaseClient);

    await expect(
      repository.update(row.id, row.partner_id, {
        displayRef: "INV-TEST",
        expectedVersionNo: 1,
      }),
    ).resolves.toEqual({ ok: false, category, rowsAffected: 0 });
  });

  it("fails closed when the RPC does not return exactly one confirmed row", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
    const repository = new SupabaseAssetRepository({
      schema: vi.fn(() => ({ rpc })),
    } as unknown as SupabaseClient);

    await expect(
      repository.update(row.id, row.partner_id, {
        displayRef: "INV-TEST",
        expectedVersionNo: 1,
      }),
    ).resolves.toEqual({ ok: false, category: "DATABASE_ERROR", rowsAffected: 0 });
  });

  it("changeStatus executes one atomic RPC carrying the expected version and audit correlation", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ ...row, current_status_code: "retired", version_no: 2 }],
      error: null,
    });
    const client = { schema: vi.fn(() => ({ rpc })) };
    const repository = new SupabaseAssetRepository(client as unknown as SupabaseClient);

    const updated = await repository.changeStatus(row.id, {
      partnerId: row.partner_id,
      fromStatusCode: "active",
      toStatusCode: "retired",
      reasonCode: "written_off",
      changedAt: "2026-07-22T00:00:00.000Z",
      changedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      previousVersionNo: 1,
      correlationId: "correlation-1",
    });

    expect(updated?.currentStatusCode).toBe("retired");
    expect(updated?.versionNo).toBe(2);
    expect(client.schema).toHaveBeenCalledWith("asset");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("transition_asset_status", {
      p_asset_id: row.id,
      p_partner_id: row.partner_id,
      p_expected_version_no: 1,
      p_to_status_code: "retired",
      p_reason_code: "written_off",
      p_changed_at: "2026-07-22T00:00:00.000Z",
      p_changed_by: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      p_correlation_id: "correlation-1",
    });
  });

  it("maps a stale-version PT409 result to the standardized HTTP 409 conflict", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "PT409", message: "Asset version conflict" },
    });
    const repository = new SupabaseAssetRepository({
      schema: vi.fn(() => ({ rpc })),
    } as unknown as SupabaseClient);

    await expect(
      repository.changeStatus(row.id, {
        partnerId: row.partner_id,
        fromStatusCode: "active",
        toStatusCode: "retired",
        reasonCode: "written_off",
        changedAt: "2026-07-22T00:00:00.000Z",
        changedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
        previousVersionNo: 1,
        correlationId: "correlation-2",
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });
});
