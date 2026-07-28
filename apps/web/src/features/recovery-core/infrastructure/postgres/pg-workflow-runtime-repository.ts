import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ApiError } from "@/shared/lib/api-error";
import type { AtomicGapAction } from "../../domain/codes";
import type { RequestContext } from "../../application/recovery-service";
import type {
  AssignmentLifecycleInput,
  CaseLifecycleInput,
  PromiseLifecycleInput,
  WorkflowRuntimeInput,
  WorkflowRuntimeRepository,
  WorkflowRuntimeResult,
  WorkflowTransitionCommandInput,
} from "../../application/ports/workflow-runtime-repository";

interface PoolLike {
  connect(): Promise<PoolClient>;
}

interface LockedCase extends QueryResultRow {
  readonly id: string;
  readonly partner_id: string;
  readonly status_id: string;
  readonly version_no: number;
}
interface LockedAssignment extends QueryResultRow {
  readonly id: string;
  readonly partner_id: string;
  readonly case_id: string;
  readonly agent_id: string;
  readonly status_id: string;
  readonly version_no: number;
}
interface LockedPromise extends QueryResultRow {
  readonly id: string;
  readonly partner_id: string;
  readonly case_id: string;
  readonly status_code: string;
  readonly version_no: number;
}
interface LockedWorkflow extends QueryResultRow {
  readonly id: string;
  readonly partner_id: string;
  readonly definition_version_id: string;
  readonly current_state_id: string;
  readonly version_no: number;
}
interface TransitionRow extends QueryResultRow {
  readonly to_state_id: string;
  readonly permission_code: string;
}

const PROMISE_STATUS: Readonly<
  Record<"promise.fulfill" | "promise.broken" | "promise.cancel", string>
> = {
  "promise.fulfill": "FULFILLED",
  "promise.broken": "BROKEN",
  "promise.cancel": "CANCELLED",
};

let sharedPool: Pool | null = null;

/** Creates the bounded server-only PostgreSQL pool used by transactional runtime commands. */
export function workflowRuntimePool(): Pool {
  if (sharedPool) return sharedPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ApiError("internal_error", "Workflow transaction runtime is not configured");
  }
  sharedPool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return sharedPool;
}

/** Converts verified application auth context into the PostgreSQL RLS claim shape. */
function jwtClaims(context: RequestContext): string {
  return JSON.stringify({
    sub: context.actor.userId,
    paysave: {
      active_partner_id: context.actor.activePartnerId,
      tenant_scope: context.actor.tenantScope,
      permissions: context.actor.permissions,
    },
  });
}

/** Throws deterministic API errors for missing resources and stale optimistic versions. */
function requireLocked<T extends { readonly version_no: number }>(
  row: T | undefined,
  expectedVersionNo: number,
  label: string,
): T {
  if (!row) throw new ApiError("not_found", `${label} not found`);
  if (row.version_no !== expectedVersionNo) {
    throw new ApiError("conflict", `${label} was modified by another request`);
  }
  return row;
}

/** Appends the immutable case timeline fact participating in the current transaction. */
async function appendTimeline(
  client: PoolClient,
  context: RequestContext,
  caseId: string,
  action: AtomicGapAction,
  resourceId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO recovery.case_timeline_events
      (partner_id, case_id, event_type, occurred_at, actor_user_id, source_type, source_id,
       summary, payload_json, schema_version, event_version_id, correlation_id, causation_id,
       visibility_code, created_by)
     VALUES ($1,$2,$3,transaction_timestamp(),$4,$5,$6,$7,$8::jsonb,1,$9,$9,$9,'internal',$4)`,
    [
      context.actor.activePartnerId,
      caseId,
      action,
      context.actor.userId,
      action.split(".")[0],
      resourceId,
      action,
      JSON.stringify({ action, resourceId }),
      context.correlationId,
    ],
  );
}

async function appendAudit(
  client: PoolClient,
  context: RequestContext,
  workflowCode: string,
  action: string,
  resourceType: string,
  resourceId: string,
  beforeState: Readonly<Record<string, unknown>>,
  afterState: Readonly<Record<string, unknown>>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.workflow_events
      (partner_id,correlation_id,workflow_code,action,resource_type,resource_id,actor_user_id,before_state,after_state)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb)`,
    [
      context.actor.activePartnerId,
      context.correlationId,
      workflowCode,
      action,
      resourceType,
      resourceId,
      context.actor.userId,
      JSON.stringify(beforeState),
      JSON.stringify(afterState),
    ],
  );
}

/** Executes close/reopen with case status history and timeline as one atomic unit. */
async function executeCase(
  client: PoolClient,
  action: "case.close" | "case.reopen",
  resourceId: string,
  input: CaseLifecycleInput,
  context: RequestContext,
): Promise<number> {
  const locked = await client.query<LockedCase>(
    `SELECT id, partner_id, status_id, version_no
       FROM recovery.cases
      WHERE id=$1 AND partner_id=$2 AND deleted_at IS NULL
      FOR UPDATE`,
    [resourceId, context.actor.activePartnerId],
  );
  const current = requireLocked(locked.rows[0], input.expectedVersionNo, "Case");
  const target = await client.query<{ id: string; is_terminal: boolean }>(
    `SELECT id, is_terminal FROM recovery.case_statuses WHERE id=$1 AND partner_id=$2`,
    [input.targetStatusId, context.actor.activePartnerId],
  );
  const status = target.rows[0];
  if (!status) throw new ApiError("validation_failed", "Target case status is unavailable");
  if (status.is_terminal !== (action === "case.close")) {
    throw new ApiError(
      "validation_failed",
      "Target case status terminal flag does not match action",
    );
  }
  const updated = await client.query(
    `UPDATE recovery.cases
        SET status_id=$1, closed_at=CASE WHEN $2 THEN transaction_timestamp() ELSE NULL END,
            version_no=version_no+1, updated_by=$3
      WHERE id=$4 AND partner_id=$5 AND version_no=$6
      RETURNING id`,
    [
      input.targetStatusId,
      action === "case.close",
      context.actor.userId,
      resourceId,
      context.actor.activePartnerId,
      input.expectedVersionNo,
    ],
  );
  if (updated.rowCount !== 1) throw new ApiError("conflict", "Case version changed during command");
  await client.query(
    `INSERT INTO recovery.case_status_history
      (partner_id,case_id,from_status_id,to_status_id,changed_at,changed_by,reason_code,created_by)
     VALUES ($1,$2,$3,$4,transaction_timestamp(),$5,$6,$5)`,
    [
      context.actor.activePartnerId,
      resourceId,
      current.status_id,
      input.targetStatusId,
      context.actor.userId,
      input.reasonCode,
    ],
  );
  await appendTimeline(client, context, resourceId, action, resourceId);
  await appendAudit(
    client,
    context,
    "recovery",
    action,
    "recovery.cases",
    resourceId,
    { statusId: current.status_id, versionNo: current.version_no },
    { statusId: input.targetStatusId, versionNo: current.version_no + 1 },
  );
  return 3;
}

/** Executes assignment lifecycle writes, including handoff facts for reassignment. */
async function executeAssignment(
  client: PoolClient,
  action: "assignment.reassign" | "assignment.accept" | "assignment.reject" | "assignment.complete",
  resourceId: string,
  input: AssignmentLifecycleInput,
  context: RequestContext,
): Promise<number> {
  const locked = await client.query<LockedAssignment>(
    `SELECT id, partner_id, case_id, agent_id, status_id, version_no
       FROM workforce.assignments
      WHERE id=$1 AND partner_id=$2 AND deleted_at IS NULL
      FOR UPDATE`,
    [resourceId, context.actor.activePartnerId],
  );
  const current = requireLocked(locked.rows[0], input.expectedVersionNo, "Assignment");
  const target = await client.query<{ id: string }>(
    `SELECT id FROM workforce.assignment_statuses WHERE id=$1 AND partner_id=$2`,
    [input.targetStatusId, context.actor.activePartnerId],
  );
  if (!target.rows[0])
    throw new ApiError("validation_failed", "Target assignment status is unavailable");
  if (action === "assignment.reassign" && !input.targetAgentId) {
    throw new ApiError("validation_failed", "targetAgentId is required for assignment.reassign");
  }
  const updated = await client.query(
    `UPDATE workforce.assignments
        SET status_id=$1,
            agent_id=COALESCE($2,agent_id),
            team_id=CASE WHEN $3 THEN $4 ELSE team_id END,
            completed_at=CASE WHEN $5 THEN transaction_timestamp() ELSE completed_at END,
            version_no=version_no+1,
            updated_by=$6
      WHERE id=$7 AND partner_id=$8 AND version_no=$9
      RETURNING id`,
    [
      input.targetStatusId,
      input.targetAgentId ?? null,
      input.targetTeamId !== undefined,
      input.targetTeamId ?? null,
      action === "assignment.complete",
      context.actor.userId,
      resourceId,
      context.actor.activePartnerId,
      input.expectedVersionNo,
    ],
  );
  if (updated.rowCount !== 1)
    throw new ApiError("conflict", "Assignment version changed during command");
  await client.query(
    `INSERT INTO workforce.assignment_status_history
      (partner_id,assignment_id,from_status_id,to_status_id,changed_at,changed_by,created_by)
     VALUES ($1,$2,$3,$4,transaction_timestamp(),$5,$5)`,
    [
      context.actor.activePartnerId,
      resourceId,
      current.status_id,
      input.targetStatusId,
      context.actor.userId,
    ],
  );
  let writes = 2;
  if (action === "assignment.reassign") {
    await client.query(
      `INSERT INTO workforce.assignment_handoffs
        (partner_id,assignment_id,from_agent_id,to_agent_id,reason_code,occurred_at,actor_user_id,created_by)
       VALUES ($1,$2,$3,$4,$5,transaction_timestamp(),$6,$6)`,
      [
        context.actor.activePartnerId,
        resourceId,
        current.agent_id,
        input.targetAgentId,
        input.reasonCode,
        context.actor.userId,
      ],
    );
    writes += 1;
  }
  await appendTimeline(client, context, current.case_id, action, resourceId);
  await appendAudit(
    client,
    context,
    "recovery",
    action,
    "workforce.assignments",
    resourceId,
    { statusId: current.status_id, agentId: current.agent_id, versionNo: current.version_no },
    {
      statusId: input.targetStatusId,
      agentId: input.targetAgentId ?? current.agent_id,
      versionNo: current.version_no + 1,
    },
  );
  return writes + 1;
}

/** Executes promise status mutation, immutable history, and timeline atomically. */
async function executePromise(
  client: PoolClient,
  action: "promise.fulfill" | "promise.broken" | "promise.cancel",
  resourceId: string,
  input: PromiseLifecycleInput,
  context: RequestContext,
): Promise<number> {
  const locked = await client.query<LockedPromise>(
    `SELECT id, partner_id, case_id, status_code, version_no
       FROM workforce.promises_to_pay
      WHERE id=$1 AND partner_id=$2
      FOR UPDATE`,
    [resourceId, context.actor.activePartnerId],
  );
  const current = requireLocked(locked.rows[0], input.expectedVersionNo, "Promise to pay");
  const targetStatus = PROMISE_STATUS[action];
  const updated = await client.query(
    `UPDATE workforce.promises_to_pay
        SET status_code=$1, version_no=version_no+1, updated_by=$2
      WHERE id=$3 AND partner_id=$4 AND version_no=$5
      RETURNING id`,
    [
      targetStatus,
      context.actor.userId,
      resourceId,
      context.actor.activePartnerId,
      input.expectedVersionNo,
    ],
  );
  if (updated.rowCount !== 1)
    throw new ApiError("conflict", "Promise version changed during command");
  await client.query(
    `INSERT INTO workforce.promise_to_pay_status_history
      (partner_id,promise_id,from_status_code,to_status_code,changed_at,changed_by,reason_code,created_by)
     VALUES ($1,$2,$3,$4,transaction_timestamp(),$5,$6,$5)`,
    [
      context.actor.activePartnerId,
      resourceId,
      current.status_code,
      targetStatus,
      context.actor.userId,
      input.reasonCode,
    ],
  );
  await appendTimeline(client, context, current.case_id, action, resourceId);
  await appendAudit(
    client,
    context,
    "recovery",
    action,
    "workforce.promises_to_pay",
    resourceId,
    { statusCode: current.status_code, versionNo: current.version_no },
    { statusCode: targetStatus, versionNo: current.version_no + 1 },
  );
  return 3;
}

/** Executes a catalog-validated workflow state transition and immutable history atomically. */
async function executeWorkflow(
  client: PoolClient,
  resourceId: string,
  input: WorkflowTransitionCommandInput,
  context: RequestContext,
): Promise<number> {
  const locked = await client.query<LockedWorkflow>(
    `SELECT id,partner_id,definition_version_id,current_state_id,version_no
       FROM workflow.instances
      WHERE id=$1 AND partner_id=$2
      FOR UPDATE`,
    [resourceId, context.actor.activePartnerId],
  );
  const current = requireLocked(locked.rows[0], input.expectedVersionNo, "Workflow instance");
  if (current.current_state_id !== input.currentStateId) {
    throw new ApiError("conflict", "Workflow state changed before command execution");
  }
  const transition = await client.query<TransitionRow>(
    `SELECT to_state_id,permission_code
       FROM workflow.transitions
      WHERE partner_id=$1 AND definition_version_id=$2 AND from_state_id=$3 AND action_code=$4`,
    [
      context.actor.activePartnerId,
      current.definition_version_id,
      input.currentStateId,
      input.actionCode,
    ],
  );
  const selected = transition.rows[0];
  if (!selected) throw new ApiError("validation_failed", "Workflow transition is not allowed");
  if (!context.actor.permissions.includes(selected.permission_code)) {
    throw new ApiError("forbidden", `Missing transition permission: ${selected.permission_code}`);
  }
  const updated = await client.query(
    `UPDATE workflow.instances
        SET current_state_id=$1, version_no=version_no+1, updated_by=$2
      WHERE id=$3 AND partner_id=$4 AND version_no=$5 AND current_state_id=$6
      RETURNING id`,
    [
      selected.to_state_id,
      context.actor.userId,
      resourceId,
      context.actor.activePartnerId,
      input.expectedVersionNo,
      input.currentStateId,
    ],
  );
  if (updated.rowCount !== 1)
    throw new ApiError("conflict", "Workflow version changed during command");
  await client.query(
    `INSERT INTO workflow.instance_history
      (partner_id,instance_id,from_state_id,to_state_id,event_code,occurred_at,actor_user_id,created_by)
     VALUES ($1,$2,$3,$4,$5,transaction_timestamp(),$6,$6)`,
    [
      context.actor.activePartnerId,
      resourceId,
      input.currentStateId,
      selected.to_state_id,
      input.actionCode,
      context.actor.userId,
    ],
  );
  await appendAudit(
    client,
    context,
    "workflow",
    input.actionCode,
    "workflow.instances",
    resourceId,
    { stateId: input.currentStateId, versionNo: current.version_no },
    { stateId: selected.to_state_id, versionNo: current.version_no + 1 },
  );
  return 2;
}

/** PostgreSQL Unit-of-Work adapter using existing tables and request-scoped RLS claims. */
export class PgWorkflowRuntimeRepository implements WorkflowRuntimeRepository {
  constructor(private readonly pool: PoolLike = workflowRuntimePool()) {}

  /** Runs the complete command under BEGIN/COMMIT and always rolls back on any failure. */
  async execute(
    action: AtomicGapAction,
    resourceId: string,
    input: WorkflowRuntimeInput,
    context: RequestContext,
  ): Promise<WorkflowRuntimeResult> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL ROLE paysave_runtime");
      await client.query("SELECT set_config('request.jwt.claims',$1,true)", [jwtClaims(context)]);
      let writes: number;
      if (action === "case.close" || action === "case.reopen") {
        writes = await executeCase(
          client,
          action,
          resourceId,
          input as CaseLifecycleInput,
          context,
        );
      } else if (action.startsWith("assignment.")) {
        writes = await executeAssignment(
          client,
          action as
            | "assignment.reassign"
            | "assignment.accept"
            | "assignment.reject"
            | "assignment.complete",
          resourceId,
          input as AssignmentLifecycleInput,
          context,
        );
      } else if (action.startsWith("promise.")) {
        writes = await executePromise(
          client,
          action as "promise.fulfill" | "promise.broken" | "promise.cancel",
          resourceId,
          input as PromiseLifecycleInput,
          context,
        );
      } else {
        writes = await executeWorkflow(
          client,
          resourceId,
          input as WorkflowTransitionCommandInput,
          context,
        );
      }
      await client.query("COMMIT");
      return { action, resourceId, transactionStatus: "committed", writes };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
