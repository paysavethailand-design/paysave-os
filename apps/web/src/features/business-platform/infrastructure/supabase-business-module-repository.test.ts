import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import type { BusinessOperationalModuleId } from "../domain/business-platform";
import { SupabaseBusinessModuleRepository } from "./supabase-business-module-repository";

interface QueryFixture {
  readonly data: readonly Record<string, unknown>[];
  readonly count?: number;
  readonly error?: { readonly message: string } | null;
}

function fakeClient(fixtures: Readonly<Record<string, QueryFixture>>) {
  const selections: string[] = [];
  const filters: string[] = [];
  const client = {
    schema(schema: string) {
      return {
        from(table: string) {
          return {
            select(columns: string) {
              selections.push(`${schema}.${table}:${columns}`);
              const constraints: Array<{ column: string; value: null }> = [];
              const query = {
                is(column: string, value: null) {
                  filters.push(`${schema}.${table}:${column}=null`);
                  constraints.push({ column, value });
                  return query;
                },
                order() {
                  return {
                    async limit() {
                      const fixture = fixtures[`${schema}.${table}`] ?? { data: [], count: 0 };
                      const data = fixture.data.filter((row) =>
                        constraints.every(({ column, value }) => row[column] === value),
                      );
                      return {
                        data,
                        count:
                          constraints.length > 0 ? data.length : (fixture.count ?? data.length),
                        error: fixture.error ?? null,
                      };
                    },
                  };
                },
              };
              return query;
            },
          };
        },
      };
    },
  };
  return { client: client as unknown as SupabaseClient, filters, selections };
}

const fixtures: Readonly<Record<string, QueryFixture>> = {
  "tenant.partners": {
    count: 2,
    data: [
      {
        id: "00000000-0000-7000-8000-000000000001",
        code: "PAYSAVE",
        name: "PAYSAVE",
        status: "active",
        timezone: "Asia/Bangkok",
        default_currency: "THB",
        updated_at: "2026-07-28T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "00000000-0000-7000-8000-000000000002",
        code: "DELETED",
        name: "Deleted partner",
        status: "inactive",
        timezone: "Asia/Bangkok",
        default_currency: "THB",
        updated_at: "2026-07-27T00:00:00.000Z",
        deleted_at: "2026-07-28T00:00:00.000Z",
      },
    ],
  },
  "recovery.cases": { count: 2, data: [] },
  "workforce.assignments": {
    count: 2,
    data: [
      {
        id: "00000000-0000-7000-8000-000000000010",
        case_id: "00000000-0000-7000-8000-000000000011",
        agent_id: "00000000-0000-7000-8000-000000000012",
        status_id: "assigned",
        assigned_at: "2026-07-28T00:00:00.000Z",
        due_at: "2026-07-29T00:00:00.000Z",
        completed_at: null,
        updated_at: "2026-07-28T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "00000000-0000-7000-8000-000000000013",
        deleted_at: "2026-07-28T00:00:00.000Z",
      },
    ],
  },
  "workflow.instances": { count: 4, data: [] },
  "workflow.work_items": { count: 5, data: [] },
  "workforce.field_visits": {
    count: 2,
    data: [
      {
        id: "00000000-0000-7000-8000-000000000020",
        assignment_id: "00000000-0000-7000-8000-000000000010",
        scheduled_at: "2026-07-28T00:00:00.000Z",
        started_at: null,
        completed_at: null,
        outcome_code: "scheduled",
        updated_at: "2026-07-28T00:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "00000000-0000-7000-8000-000000000021",
        deleted_at: "2026-07-28T00:00:00.000Z",
      },
    ],
  },
  "finance.payments": { count: 7, data: [] },
  "performance.commission_runs": { count: 8, data: [] },
  "finance.reconciliation_batches": { count: 9, data: [] },
  "performance.kpi_events": { count: 10, data: [] },
  "performance.kpi_period_results": { count: 11, data: [] },
  "communication.notifications": { count: 12, data: [] },
  "communication.notification_deliveries": { count: 13, data: [] },
};

const moduleIds: readonly BusinessOperationalModuleId[] = [
  "partner-management",
  "case-management",
  "assignment-engine",
  "workflow-engine",
  "field-operations",
  "commission-finance",
  "executive-dashboard",
  "business-analytics",
  "reports",
  "notifications",
];

describe("SupabaseBusinessModuleRepository", () => {
  it("loads all Stage 5.4 business modules through RLS-scoped safe projections", async () => {
    const { client, filters, selections } = fakeClient(fixtures);
    const repository = new SupabaseBusinessModuleRepository(client);
    const snapshots = await Promise.all(moduleIds.map((id) => repository.loadModule(id)));

    expect(snapshots.map((snapshot) => snapshot.moduleId)).toEqual(moduleIds);
    expect(snapshots.every((snapshot) => snapshot.source.length > 0)).toBe(true);
    expect(snapshots.every((snapshot) => Object.isFrozen(snapshot))).toBe(true);
    expect(snapshots[0]?.records[0]).toMatchObject({ title: "PAYSAVE", status: "active" });
    expect(snapshots[0]?.records).toHaveLength(1);
    expect(snapshots[0]?.metrics[0]?.value).toBe(1);
    expect(snapshots[2]?.records).toHaveLength(1);
    expect(snapshots[2]?.metrics[0]?.value).toBe(1);
    expect(snapshots[4]?.records).toHaveLength(1);
    expect(snapshots[4]?.metrics[0]?.value).toBe(1);
    expect(filters).toEqual(
      expect.arrayContaining([
        "tenant.partners:deleted_at=null",
        "workforce.assignments:deleted_at=null",
        "workforce.field_visits:deleted_at=null",
      ]),
    );

    const projection = selections.join("\n");
    expect(projection).not.toMatch(
      /payload_json|destination_encrypted|destination_hash|latitude_encrypted|longitude_encrypted|idempotency_key/i,
    );
    expect(projection).toContain("tenant.partners");
    expect(projection).toContain("finance.payments");
    expect(projection).toContain("communication.notifications");
  });

  it("throws without leaking provider error details when a read fails", async () => {
    const { client } = fakeClient({
      "tenant.partners": { data: [], error: { message: "credential value must not leak" } },
    });
    const repository = new SupabaseBusinessModuleRepository(client);
    await expect(repository.loadModule("partner-management")).rejects.toThrow(
      "business_read_failed:tenant.partners",
    );
  });
});
