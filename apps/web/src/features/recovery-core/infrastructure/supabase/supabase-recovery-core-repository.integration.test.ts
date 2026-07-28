import { FakeSupabaseClient } from "@paysave/testing";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseRecoveryCoreRepository } from "./supabase-recovery-core-repository";
const row = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partner_id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  branch_id: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  customer_id: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
  contract_id: null,
  status_id: "3b3c4d5e-6f78-4901-90ab-cdef01234569",
  priority: "high",
  opened_at: "2026-07-22T00:00:00.000Z",
  next_action_at: "2026-07-23T00:00:00.000Z",
  closed_at: null,
  version_no: 2,
  business_object_id: "4b3c4d5e-6f78-4901-90ab-cdef01234560",
  created_at: "2026-07-22T00:00:00.000Z",
  updated_at: "2026-07-22T00:01:00.000Z",
};
describe("SupabaseRecoveryCoreRepository integration", () => {
  it("uses tenant and version_no predicates and increments once", async () => {
    const client = new FakeSupabaseClient([{ data: row, error: null }]);
    const repository = new SupabaseRecoveryCoreRepository(client as unknown as SupabaseClient);
    await expect(
      repository.updateCase(row.id, {
        partnerId: row.partner_id,
        expectedVersionNo: 1,
        priority: "high",
        updatedBy: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
      }),
    ).resolves.toMatchObject({ outcome: "updated" });
    const calls = client.recordedBuilders()[0]?.recordedCalls() ?? [];
    expect(calls).toContainEqual({ method: "eq", args: ["partner_id", row.partner_id] });
    expect(calls).toContainEqual({ method: "eq", args: ["version_no", 1] });
    expect(calls[0]).toMatchObject({
      method: "update",
      args: [
        { priority: "high", version_no: 2, updated_by: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111" },
      ],
    });
  });
  it("returns version_conflict when no row updated but the row exists", async () => {
    const client = new FakeSupabaseClient([
      { data: null, error: null },
      { data: { id: row.id }, error: null },
    ]);
    const repository = new SupabaseRecoveryCoreRepository(client as unknown as SupabaseClient);
    await expect(
      repository.updateCase(row.id, {
        partnerId: row.partner_id,
        expectedVersionNo: 1,
        priority: "critical",
        updatedBy: null,
      }),
    ).resolves.toEqual({ outcome: "version_conflict" });
  });
  it("uses a compound occurred_at and id keyset predicate for timeline pagination", async () => {
    const client = new FakeSupabaseClient([{ data: [], error: null }]);
    const repository = new SupabaseRecoveryCoreRepository(client as unknown as SupabaseClient);
    const before = { occurredAt: "2026-07-22T12:00:00.000Z", id: row.id };
    await repository.listTimeline({ partnerId: row.partner_id, caseId: row.id, limit: 20, before });
    const calls = client.recordedBuilders()[0]?.recordedCalls() ?? [];
    expect(calls).toContainEqual({
      method: "or",
      args: [
        `occurred_at.lt.${before.occurredAt},and(occurred_at.eq.${before.occurredAt},id.lt.${before.id})`,
      ],
    });
  });
});
