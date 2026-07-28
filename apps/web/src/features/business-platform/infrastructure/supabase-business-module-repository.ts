import type { SupabaseClient } from "@supabase/supabase-js";
import { createAuthServerClient } from "@/features/auth/server";
import type { BusinessOperationalModuleId } from "../domain/business-platform";
import type {
  BusinessModuleRepository,
  BusinessModuleSnapshot,
} from "../application/ports/business-module-repository";
import type { BusinessMetric, BusinessRecord } from "../domain/business-module";

type SafeRow = Readonly<Record<string, unknown>>;

interface ReadResult {
  readonly count: number;
  readonly rows: readonly SafeRow[];
}

const moduleCopy: Record<
  BusinessOperationalModuleId,
  Readonly<{ title: string; description: string; source: string }>
> = {
  "partner-management": {
    title: "Partner Management",
    description: "Tenant-scoped partner directory, lifecycle status, and operating profile.",
    source: "tenant.partners",
  },
  "case-management": {
    title: "Case Management",
    description: "Recovery case portfolio, priorities, lifecycle status, and recent activity.",
    source: "recovery.cases",
  },
  "assignment-engine": {
    title: "Assignment Management",
    description: "Assignment queue, ownership, due dates, completion status, and capacity signals.",
    source: "workforce.assignments",
  },
  "workflow-engine": {
    title: "Workflow Management",
    description: "Workflow instances, pending work items, state, history, and SLA signals.",
    source: "workflow.instances + workflow.work_items",
  },
  "field-operations": {
    title: "Field Operations",
    description: "Scheduled visits, execution checkpoints, outcomes, and daily field activity.",
    source: "workforce.field_visits",
  },
  "commission-finance": {
    title: "Commission & Finance",
    description:
      "Payments, reconciliations, commission runs, and payout-ready financial summaries.",
    source: "finance.payments + performance.commission_runs",
  },
  "executive-dashboard": {
    title: "Executive Dashboard",
    description: "Cross-domain operational health using authoritative tenant-scoped aggregates.",
    source: "tenant + recovery + workforce + finance",
  },
  "business-analytics": {
    title: "Business Analytics",
    description: "KPI event activity and performance signals without speculative forecasting.",
    source: "performance.kpi_events + performance.kpi_period_results",
  },
  reports: {
    title: "Reports",
    description: "Application-derived operational report summaries from authoritative read models.",
    source: "recovery + workforce + finance + performance",
  },
  notifications: {
    title: "Notifications",
    description:
      "Notification queue and delivery status without recipient destinations or payloads.",
    source: "communication.notifications + communication.notification_deliveries",
  },
};

function text(row: SafeRow, key: string, fallback = "UNKNOWN"): string {
  const value = row[key];
  return typeof value === "string" && value.trim() ? value : fallback;
}

function timestamp(row: SafeRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function numberValue(row: SafeRow, key: string): number {
  const value = row[key];
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function opaque(id: string): string {
  return id.length <= 8 ? id : `••••${id.slice(-8)}`;
}

function metric(label: string, value: number, detail: string): BusinessMetric {
  return Object.freeze({ label, value, detail, tone: "info" as const });
}

function record(
  row: SafeRow,
  options: {
    readonly title: string;
    readonly statusKey: string;
    readonly detail: string;
    readonly timestampKey: string;
  },
): BusinessRecord {
  const id = text(row, "id");
  return Object.freeze({
    id,
    title: options.title,
    status: text(row, options.statusKey),
    detail: options.detail,
    occurredAt: timestamp(row, options.timestampKey),
  });
}

/**
 * Trusted request-scoped adapter. Supabase is contained here; RLS supplies tenant isolation.
 * The adapter deliberately selects only non-secret, non-PII columns.
 */
export class SupabaseBusinessModuleRepository implements BusinessModuleRepository {
  constructor(private readonly client: SupabaseClient) {}

  private async read(
    schema: string,
    table: string,
    columns: string,
    orderColumn: string,
    limit = 50,
    excludeSoftDeleted = false,
  ): Promise<ReadResult> {
    const selection = this.client.schema(schema).from(table).select(columns, { count: "exact" });
    const query = excludeSoftDeleted ? selection.is("deleted_at", null) : selection;
    const result = await query.order(orderColumn, { ascending: false }).limit(limit);
    if (result.error) throw new Error(`business_read_failed:${schema}.${table}`);
    return Object.freeze({
      count: result.count ?? result.data?.length ?? 0,
      rows: Object.freeze((result.data ?? []) as unknown as SafeRow[]),
    });
  }

  private snapshot(
    moduleId: BusinessOperationalModuleId,
    metrics: readonly BusinessMetric[],
    records: readonly BusinessRecord[],
  ): BusinessModuleSnapshot {
    const copy = moduleCopy[moduleId];
    return Object.freeze({
      moduleId,
      publishedAt: new Date().toISOString(),
      source: copy.source,
      title: copy.title,
      description: copy.description,
      metrics: Object.freeze([...metrics]),
      records: Object.freeze([...records]),
    });
  }

  async loadModule(moduleId: BusinessOperationalModuleId): Promise<BusinessModuleSnapshot> {
    switch (moduleId) {
      case "partner-management": {
        const data = await this.read(
          "tenant",
          "partners",
          "id,code,name,status,timezone,default_currency,updated_at,deleted_at",
          "updated_at",
          50,
          true,
        );
        const rows = data.rows.filter((row) => row.deleted_at === null);
        return this.snapshot(
          moduleId,
          [metric("Visible partners", data.count, "RLS-scoped tenant partner records")],
          rows.map((row) =>
            record(row, {
              title: text(row, "name"),
              statusKey: "status",
              detail: `${text(row, "code")} · ${text(row, "timezone")} · ${text(row, "default_currency")}`,
              timestampKey: "updated_at",
            }),
          ),
        );
      }
      case "case-management": {
        const data = await this.read(
          "recovery",
          "cases",
          "id,status_id,priority,branch_id,opened_at,next_action_at,closed_at,updated_at",
          "updated_at",
        );
        return this.snapshot(
          moduleId,
          [
            metric("Cases", data.count, "Visible recovery cases"),
            metric(
              "Closed in latest page",
              data.rows.filter((row) => row.closed_at !== null).length,
              "Closed records among the latest visible rows",
            ),
          ],
          data.rows.map((row) =>
            record(row, {
              title: `Case ${opaque(text(row, "id"))}`,
              statusKey: "status_id",
              detail: `${text(row, "priority")} priority · branch ${opaque(text(row, "branch_id"))}`,
              timestampKey: "updated_at",
            }),
          ),
        );
      }
      case "assignment-engine": {
        const data = await this.read(
          "workforce",
          "assignments",
          "id,case_id,agent_id,status_id,assigned_at,due_at,completed_at,updated_at,deleted_at",
          "updated_at",
          50,
          true,
        );
        const rows = data.rows.filter((row) => row.deleted_at === null);
        return this.snapshot(
          moduleId,
          [
            metric("Assignments", data.count, "Visible assignment records"),
            metric(
              "Open in latest page",
              rows.filter((row) => row.completed_at === null).length,
              "Incomplete assignments among latest visible rows",
            ),
          ],
          rows.map((row) =>
            record(row, {
              title: `Assignment ${opaque(text(row, "id"))}`,
              statusKey: "status_id",
              detail: `Case ${opaque(text(row, "case_id"))} · agent ${opaque(text(row, "agent_id"))}`,
              timestampKey: "due_at",
            }),
          ),
        );
      }
      case "workflow-engine": {
        const [instances, items] = await Promise.all([
          this.read(
            "workflow",
            "instances",
            "id,status,current_state_id,started_at,completed_at,updated_at",
            "updated_at",
          ),
          this.read(
            "workflow",
            "work_items",
            "id,instance_id,task_type,status,due_at,completed_at,updated_at",
            "updated_at",
          ),
        ]);
        return this.snapshot(
          moduleId,
          [
            metric("Workflow instances", instances.count, "Visible workflow instances"),
            metric("Work items", items.count, "Visible workflow work items"),
            metric(
              "Pending in latest page",
              items.rows.filter((row) => row.completed_at === null).length,
              "Incomplete work items among latest visible rows",
            ),
          ],
          instances.rows.map((row) =>
            record(row, {
              title: `Workflow ${opaque(text(row, "id"))}`,
              statusKey: "status",
              detail: `State ${opaque(text(row, "current_state_id"))}`,
              timestampKey: "updated_at",
            }),
          ),
        );
      }
      case "field-operations": {
        const data = await this.read(
          "workforce",
          "field_visits",
          "id,assignment_id,scheduled_at,started_at,completed_at,outcome_code,updated_at,deleted_at",
          "updated_at",
          50,
          true,
        );
        const rows = data.rows.filter((row) => row.deleted_at === null);
        return this.snapshot(
          moduleId,
          [
            metric("Field visits", data.count, "Visible field visit records"),
            metric(
              "Completed in latest page",
              rows.filter((row) => row.completed_at !== null).length,
              "Completed visits among latest visible rows",
            ),
          ],
          rows.map((row) =>
            record(row, {
              title: `Visit ${opaque(text(row, "id"))}`,
              statusKey: "outcome_code",
              detail: `Assignment ${opaque(text(row, "assignment_id"))}`,
              timestampKey: "scheduled_at",
            }),
          ),
        );
      }
      case "commission-finance": {
        const [payments, runs, reconciliations] = await Promise.all([
          this.read(
            "finance",
            "payments",
            "id,status_id,amount,currency_code,received_at,confirmed_at,updated_at",
            "received_at",
          ),
          this.read(
            "performance",
            "commission_runs",
            "id,status,period_start,period_end,started_at,finalized_at,updated_at",
            "updated_at",
          ),
          this.read(
            "finance",
            "reconciliation_batches",
            "id,status,total_amount,period_start,period_end,finalized_at,updated_at",
            "updated_at",
          ),
        ]);
        const total = payments.rows.reduce((sum, row) => sum + numberValue(row, "amount"), 0);
        return this.snapshot(
          moduleId,
          [
            metric("Payments", payments.count, "Visible payment records"),
            metric("Latest-page amount", total, "Sum of latest visible payment rows"),
            metric("Commission runs", runs.count, "Visible commission calculation runs"),
            metric("Reconciliations", reconciliations.count, "Visible reconciliation batches"),
          ],
          payments.rows.map((row) =>
            record(row, {
              title: `Payment ${opaque(text(row, "id"))}`,
              statusKey: "status_id",
              detail: `${numberValue(row, "amount")} ${text(row, "currency_code")}`,
              timestampKey: "received_at",
            }),
          ),
        );
      }
      case "executive-dashboard": {
        const [partners, cases, assignments, payments] = await Promise.all([
          this.read("tenant", "partners", "id,updated_at", "updated_at", 1),
          this.read("recovery", "cases", "id,updated_at", "updated_at", 1),
          this.read("workforce", "assignments", "id,updated_at", "updated_at", 1),
          this.read("finance", "payments", "id,received_at", "received_at", 1),
        ]);
        return this.snapshot(
          moduleId,
          [
            metric("Partners", partners.count, "Visible partners"),
            metric("Cases", cases.count, "Visible cases"),
            metric("Assignments", assignments.count, "Visible assignments"),
            metric("Payments", payments.count, "Visible payments"),
          ],
          [],
        );
      }
      case "business-analytics": {
        const [events, results] = await Promise.all([
          this.read(
            "performance",
            "kpi_events",
            "id,event_type,value_numeric,occurred_at,source_ref",
            "occurred_at",
          ),
          this.read(
            "performance",
            "kpi_period_results",
            "id,result_value,period_start,period_end,calculated_at,finalized_at",
            "calculated_at",
          ),
        ]);
        const total = events.rows.reduce((sum, row) => sum + numberValue(row, "value_numeric"), 0);
        return this.snapshot(
          moduleId,
          [
            metric("KPI events", events.count, "Visible KPI event records"),
            metric("Latest-page KPI value", total, "Sum across latest visible KPI events"),
            metric("Period results", results.count, "Visible finalized and draft period results"),
          ],
          events.rows.map((row) =>
            record(row, {
              title: text(row, "event_type"),
              statusKey: "event_type",
              detail: `Value ${numberValue(row, "value_numeric")} · source ${opaque(text(row, "source_ref"))}`,
              timestampKey: "occurred_at",
            }),
          ),
        );
      }
      case "reports": {
        const [cases, visits, payments, commissions] = await Promise.all([
          this.read("recovery", "cases", "id,updated_at", "updated_at", 1),
          this.read("workforce", "field_visits", "id,updated_at", "updated_at", 1),
          this.read("finance", "payments", "id,received_at", "received_at", 1),
          this.read("performance", "commission_runs", "id,updated_at", "updated_at", 1),
        ]);
        const reports = [
          { id: "case-portfolio", title: "Case Portfolio", value: cases.count },
          { id: "field-activity", title: "Field Activity", value: visits.count },
          { id: "payment-register", title: "Payment Register", value: payments.count },
          { id: "commission-register", title: "Commission Register", value: commissions.count },
        ];
        return this.snapshot(
          moduleId,
          reports.map((item) => metric(item.title, item.value, "Current RLS-scoped record count")),
          reports.map((item) =>
            Object.freeze({
              id: item.id,
              title: item.title,
              status: "AVAILABLE",
              detail: `${item.value} authoritative records currently visible`,
              occurredAt: null,
            }),
          ),
        );
      }
      case "notifications": {
        const [notifications, deliveries] = await Promise.all([
          this.read(
            "communication",
            "notifications",
            "id,event_type,priority,scheduled_at,status,created_at,updated_at",
            "updated_at",
          ),
          this.read(
            "communication",
            "notification_deliveries",
            "id,notification_id,channel,attempt_no,status,attempted_at,next_retry_at",
            "attempted_at",
          ),
        ]);
        return this.snapshot(
          moduleId,
          [
            metric("Notifications", notifications.count, "Visible notification queue records"),
            metric("Delivery attempts", deliveries.count, "Visible delivery attempts"),
          ],
          notifications.rows.map((row) =>
            record(row, {
              title: text(row, "event_type"),
              statusKey: "status",
              detail: `Priority ${text(row, "priority")}; recipient and payload data are not projected`,
              timestampKey: "scheduled_at",
            }),
          ),
        );
      }
    }
  }
}

export async function createTrustedBusinessModuleRepository(): Promise<BusinessModuleRepository> {
  return new SupabaseBusinessModuleRepository(await createAuthServerClient());
}
