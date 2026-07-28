import { createHash } from "node:crypto";
import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { ApiError } from "@/shared/lib/api-error";
import type { RequestContext } from "../../application/recovery-service";

interface PoolLike {
  connect(): Promise<PoolClient>;
}
interface LockedCase extends QueryResultRow {
  readonly id: string;
  readonly partner_id: string;
  readonly status_id: string;
  readonly version_no: number;
  readonly business_object_id: string;
}
export interface SubmitReviewInput {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly reasonCode: string;
  readonly policyVersionId: string;
  readonly policyStepId: string;
  readonly dueAt: string;
}
export interface DecideReviewInput {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly approvalRequestId: string;
  readonly approvalStepId: string;
  readonly actorMembershipId: string;
  readonly decision: "approved" | "rejected";
  readonly reasonCode: string;
  readonly evidence: string;
}
export interface CloseCaseInput {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly approvalRequestId: string;
  readonly reasonCode: string;
  readonly currencyCode: string;
}
export interface PhotoMetadataInput {
  readonly assignmentId: string;
  readonly visitId?: string;
  readonly purpose: "before" | "after" | "device" | "location";
  readonly filename: string;
  readonly mediaType: "image/jpeg" | "image/png" | "image/webp";
  readonly sizeBytes: number;
  readonly checksumSha256: string;
  readonly objectKey: string;
  readonly device?: Readonly<Record<string, string>>;
  readonly location?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly accuracyMeters?: number;
  };
}

let pool: Pool | null = null;
function operationPool(): Pool {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new ApiError("internal_error", "Operation MVP database runtime is not configured");
  }
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
  return pool;
}
function claims(context: RequestContext): string {
  return JSON.stringify({
    sub: context.actor.userId,
    paysave: {
      active_partner_id: context.actor.activePartnerId,
      tenant_scope: context.actor.tenantScope,
      permissions: context.actor.permissions,
    },
  });
}
function requirePartner(context: RequestContext): string {
  const partnerId = context.actor.activePartnerId;
  if (!partnerId) throw new ApiError("forbidden", "Active partner is required");
  return partnerId;
}
function requireVersion(row: LockedCase | undefined, expected: number): LockedCase {
  if (!row) throw new ApiError("not_found", "Case not found");
  if (row.version_no !== expected) {
    throw new ApiError("conflict", "Case was modified by another request");
  }
  return row;
}
async function lockCase(
  client: PoolClient,
  caseId: string,
  expectedVersionNo: number,
  partnerId: string,
): Promise<LockedCase> {
  const result = await client.query<LockedCase>(
    `SELECT id,partner_id,status_id,version_no,business_object_id
       FROM recovery.cases
      WHERE id=$1 AND partner_id=$2 AND deleted_at IS NULL
      FOR UPDATE`,
    [caseId, partnerId],
  );
  return requireVersion(result.rows[0], expectedVersionNo);
}
async function requireTargetStatus(
  client: PoolClient,
  partnerId: string,
  targetStatusId: string,
  terminal: boolean,
): Promise<void> {
  const result = await client.query<{ id: string; is_terminal: boolean }>(
    `SELECT id,is_terminal FROM recovery.case_statuses WHERE id=$1 AND partner_id=$2`,
    [targetStatusId, partnerId],
  );
  const row = result.rows[0];
  if (!row) throw new ApiError("validation_failed", "Target case status is unavailable");
  if (row.is_terminal !== terminal) {
    throw new ApiError("validation_failed", "Target case terminal flag does not match operation");
  }
}
async function updateCaseStatus(
  client: PoolClient,
  current: LockedCase,
  targetStatusId: string,
  reasonCode: string,
  context: RequestContext,
  terminal: boolean,
): Promise<void> {
  const updated = await client.query(
    `UPDATE recovery.cases
        SET status_id=$1,
            closed_at=CASE WHEN $2 THEN transaction_timestamp() ELSE NULL END,
            version_no=version_no+1,
            updated_by=$3
      WHERE id=$4 AND partner_id=$5 AND version_no=$6
      RETURNING id`,
    [
      targetStatusId,
      terminal,
      context.actor.userId,
      current.id,
      current.partner_id,
      current.version_no,
    ],
  );
  if (updated.rowCount !== 1)
    throw new ApiError("conflict", "Case version changed during operation");
  await client.query(
    `INSERT INTO recovery.case_status_history
      (partner_id,case_id,from_status_id,to_status_id,changed_at,changed_by,reason_code,created_by)
     VALUES ($1,$2,$3,$4,transaction_timestamp(),$5,$6,$5)`,
    [
      current.partner_id,
      current.id,
      current.status_id,
      targetStatusId,
      context.actor.userId,
      reasonCode,
    ],
  );
  await client.query(
    `INSERT INTO audit.workflow_events
      (partner_id,correlation_id,workflow_code,action,resource_type,resource_id,actor_user_id,before_state,after_state)
     VALUES ($1,$2,'recovery','case.status_transition','recovery.case',$3,$4,$5::jsonb,$6::jsonb)`,
    [
      current.partner_id,
      context.correlationId,
      current.id,
      context.actor.userId,
      JSON.stringify({ statusId: current.status_id, versionNo: current.version_no }),
      JSON.stringify({ statusId: targetStatusId, versionNo: current.version_no + 1, terminal }),
    ],
  );
}
async function timeline(
  client: PoolClient,
  current: LockedCase,
  context: RequestContext,
  action: string,
  sourceId: string,
  previousStatusId: string | null,
  newStatusId: string | null,
  metadata: Readonly<Record<string, unknown>> = {},
): Promise<void> {
  await client.query(
    `INSERT INTO recovery.case_timeline_events
      (partner_id,case_id,event_type,occurred_at,actor_user_id,source_type,source_id,summary,
       payload_json,schema_version,event_version_id,correlation_id,causation_id,visibility_code,created_by)
     VALUES ($1,$2,$3,transaction_timestamp(),$4,$5,$6,$7,$8::jsonb,1,$9,$9,$9,'internal',$4)`,
    [
      current.partner_id,
      current.id,
      action,
      context.actor.userId,
      action.split(".")[0],
      sourceId,
      action,
      JSON.stringify({
        who: context.actor.userId,
        caseId: current.id,
        action,
        previousStatusId,
        newStatusId,
        ...metadata,
      }),
      context.correlationId,
    ],
  );
}
async function transaction<T>(
  poolLike: PoolLike,
  context: RequestContext,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await poolLike.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE paysave_runtime");
    await client.query("SELECT set_config('request.jwt.claims',$1,true)", [claims(context)]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/** PostgreSQL transaction adapter for the Stage 4.2 operational workflow only. */
export class PgOperationMvpRepository {
  constructor(private readonly poolLike: PoolLike = operationPool()) {}

  async submitReview(caseId: string, input: SubmitReviewInput, context: RequestContext) {
    return transaction(this.poolLike, context, async (client) => {
      const partnerId = requirePartner(context);
      const current = await lockCase(client, caseId, input.expectedVersionNo, partnerId);
      await requireTargetStatus(client, partnerId, input.targetStatusId, false);
      await updateCaseStatus(
        client,
        current,
        input.targetStatusId,
        input.reasonCode,
        context,
        false,
      );
      const subjectHash = createHash("sha256")
        .update(`${caseId}:${input.expectedVersionNo}`)
        .digest();
      const request = await client.query<{ id: string }>(
        `INSERT INTO approval.requests
          (partner_id,policy_version_id,business_object_id,requested_by,status,requested_at,version_no,
           subject_version_ref,subject_version_hash,created_by,updated_by)
         VALUES ($1,$2,$3,$4,'pending',transaction_timestamp(),1,$5,$6,$4,$4)
         RETURNING id`,
        [
          partnerId,
          input.policyVersionId,
          current.business_object_id,
          context.actor.userId,
          `case:${caseId}:v${input.expectedVersionNo}`,
          subjectHash,
        ],
      );
      const approvalRequestId = request.rows[0]?.id;
      if (!approvalRequestId)
        throw new ApiError("internal_error", "Approval request was not created");
      const step = await client.query<{ id: string }>(
        `INSERT INTO approval.request_steps
          (partner_id,request_id,policy_step_id,status,due_at,created_by,updated_by)
         VALUES ($1,$2,$3,'pending',$4,$5,$5)
         RETURNING id`,
        [partnerId, approvalRequestId, input.policyStepId, input.dueAt, context.actor.userId],
      );
      if (!step.rows[0]) throw new ApiError("internal_error", "Approval step was not created");
      await timeline(
        client,
        current,
        context,
        "case.submit_review",
        approvalRequestId,
        current.status_id,
        input.targetStatusId,
        { approvalStatus: "pending" },
      );
      return {
        caseId,
        approvalRequestId,
        status: "pending" as const,
        transactionStatus: "committed" as const,
      };
    });
  }

  async decideReview(caseId: string, input: DecideReviewInput, context: RequestContext) {
    return transaction(this.poolLike, context, async (client) => {
      const partnerId = requirePartner(context);
      const current = await lockCase(client, caseId, input.expectedVersionNo, partnerId);
      const request = await client.query<{ id: string; status: string; version_no: number }>(
        `SELECT id,status,version_no FROM approval.requests
          WHERE id=$1 AND partner_id=$2 AND business_object_id=$3 FOR UPDATE`,
        [input.approvalRequestId, partnerId, current.business_object_id],
      );
      if (request.rows[0]?.status !== "pending") {
        throw new ApiError("conflict", "Approval request is not pending");
      }
      const step = await client.query<{ id: string; status: string }>(
        `SELECT id,status FROM approval.request_steps
          WHERE id=$1 AND partner_id=$2 AND request_id=$3 FOR UPDATE`,
        [input.approvalStepId, partnerId, input.approvalRequestId],
      );
      if (step.rows[0]?.status !== "pending")
        throw new ApiError("conflict", "Approval step is not pending");
      await requireTargetStatus(client, partnerId, input.targetStatusId, false);
      const updatedRequest = await client.query(
        `UPDATE approval.requests
            SET status=$1,decided_at=transaction_timestamp(),version_no=version_no+1,updated_by=$2
          WHERE id=$3 AND partner_id=$4 AND status='pending'
          RETURNING id`,
        [input.decision, context.actor.userId, input.approvalRequestId, partnerId],
      );
      if (updatedRequest.rowCount !== 1) throw new ApiError("conflict", "Approval request changed");
      const updatedStep = await client.query(
        `UPDATE approval.request_steps
            SET status=$1,completed_at=transaction_timestamp(),updated_by=$2
          WHERE id=$3 AND partner_id=$4 AND status='pending'
          RETURNING id`,
        [input.decision, context.actor.userId, input.approvalStepId, partnerId],
      );
      if (updatedStep.rowCount !== 1) throw new ApiError("conflict", "Approval step changed");
      await client.query(
        `INSERT INTO approval.decisions
          (partner_id,request_step_id,actor_membership_id,decision_code,reason_code,decided_at,
           evidence_hash,created_by)
         VALUES ($1,$2,$3,$4,$5,transaction_timestamp(),$6,$7)`,
        [
          partnerId,
          input.approvalStepId,
          input.actorMembershipId,
          input.decision === "approved" ? "approve" : "reject",
          input.reasonCode,
          createHash("sha256").update(input.evidence).digest(),
          context.actor.userId,
        ],
      );
      await updateCaseStatus(
        client,
        current,
        input.targetStatusId,
        input.reasonCode,
        context,
        false,
      );
      await timeline(
        client,
        current,
        context,
        `case.${input.decision}`,
        input.approvalRequestId,
        current.status_id,
        input.targetStatusId,
        { approvalStatus: input.decision },
      );
      return { caseId, status: input.decision, transactionStatus: "committed" as const };
    });
  }

  async closeCase(caseId: string, input: CloseCaseInput, context: RequestContext) {
    return transaction(this.poolLike, context, async (client) => {
      const partnerId = requirePartner(context);
      const current = await lockCase(client, caseId, input.expectedVersionNo, partnerId);
      await requireTargetStatus(client, partnerId, input.targetStatusId, true);
      const approval = await client.query<{ id: string; status: string }>(
        `SELECT id,status FROM approval.requests
          WHERE id=$1 AND partner_id=$2 AND business_object_id=$3 FOR UPDATE`,
        [input.approvalRequestId, partnerId, current.business_object_id],
      );
      if (approval.rows[0]?.status !== "approved") {
        throw new ApiError("conflict", "Case requires an approved review before close");
      }
      const assignment = await client.query<{ agent_id: string }>(
        `SELECT agent_id FROM workforce.assignments
          WHERE partner_id=$1 AND case_id=$2 AND deleted_at IS NULL
          ORDER BY assigned_at DESC LIMIT 1 FOR UPDATE`,
        [partnerId, caseId],
      );
      const agentId = assignment.rows[0]?.agent_id;
      if (!agentId) throw new ApiError("validation_failed", "Case has no assigned field agent");
      const plan = await client.query<{ id: string }>(
        `SELECT pv.id
           FROM performance.commission_plan_versions pv
           JOIN performance.commission_plans p ON p.id=pv.plan_id AND p.partner_id=pv.partner_id
          WHERE pv.partner_id=$1 AND p.status='active' AND pv.effective_from<=transaction_timestamp()
            AND (pv.effective_to IS NULL OR pv.effective_to>transaction_timestamp())
          ORDER BY pv.version_no DESC LIMIT 1`,
        [partnerId],
      );
      const planVersionId = plan.rows[0]?.id;
      if (!planVersionId)
        throw new ApiError("validation_failed", "Active commission plan is unavailable");
      await updateCaseStatus(
        client,
        current,
        input.targetStatusId,
        input.reasonCode,
        context,
        true,
      );
      await timeline(
        client,
        current,
        context,
        "case.close",
        caseId,
        current.status_id,
        input.targetStatusId,
        { locked: true },
      );
      const object = await client.query<{ id: string }>(
        `INSERT INTO workflow.business_objects
          (partner_id,object_kind,registered_at,created_by,updated_by)
         VALUES ($1,'commission',transaction_timestamp(),$2,$2)
         RETURNING id`,
        [partnerId, context.actor.userId],
      );
      const businessObjectId = object.rows[0]?.id;
      if (!businessObjectId)
        throw new ApiError("internal_error", "Commission object was not created");
      const run = await client.query<{ id: string }>(
        `INSERT INTO performance.commission_runs
          (partner_id,plan_version_id,period_start,period_end,status,started_at,business_object_id,
           created_by,updated_by)
         VALUES ($1,$2,current_date,current_date+1,'pending',transaction_timestamp(),$3,$4,$4)
         RETURNING id`,
        [partnerId, planVersionId, businessObjectId, context.actor.userId],
      );
      const runId = run.rows[0]?.id;
      if (!runId) throw new ApiError("internal_error", "Commission run was not created");
      const item = await client.query<{ id: string; status: string }>(
        `INSERT INTO performance.commission_items
          (partner_id,run_id,agent_id,case_id,payment_id,base_amount,commission_amount,currency_code,status,created_by)
         VALUES ($1,$2,$3,$4,NULL,0,0,$5,'pending',$6)
         RETURNING id,status`,
        [partnerId, runId, agentId, caseId, input.currencyCode, context.actor.userId],
      );
      const commission = item.rows[0];
      if (!commission) throw new ApiError("internal_error", "Pending commission was not created");
      await timeline(
        client,
        current,
        context,
        "commission.pending",
        commission.id,
        input.targetStatusId,
        input.targetStatusId,
        { commissionStatus: commission.status, commissionAmount: 0 },
      );
      return {
        caseId,
        locked: true,
        commissionId: commission.id,
        commissionStatus: "pending" as const,
        transactionStatus: "committed" as const,
      };
    });
  }

  async recordPhoto(caseId: string, input: PhotoMetadataInput, context: RequestContext) {
    return transaction(this.poolLike, context, async (client) => {
      const partnerId = requirePartner(context);
      const current = await lockCase(client, caseId, Number.MAX_SAFE_INTEGER, partnerId).catch(
        async (error) => {
          if (error instanceof ApiError && error.code === "conflict") {
            const result = await client.query<LockedCase>(
              `SELECT id,partner_id,status_id,version_no,business_object_id
               FROM recovery.cases WHERE id=$1 AND partner_id=$2 AND deleted_at IS NULL FOR UPDATE`,
              [caseId, partnerId],
            );
            if (!result.rows[0]) throw new ApiError("not_found", "Case not found");
            return result.rows[0];
          }
          throw error;
        },
      );
      const assignment = await client.query<{ id: string }>(
        `SELECT id FROM workforce.assignments
          WHERE id=$1 AND partner_id=$2 AND case_id=$3 AND deleted_at IS NULL`,
        [input.assignmentId, partnerId, caseId],
      );
      if (!assignment.rows[0]) throw new ApiError("not_found", "Assignment not found for case");
      if (input.visitId) {
        const visit = await client.query<{ id: string }>(
          `SELECT id FROM workforce.field_visits
            WHERE id=$1 AND partner_id=$2 AND assignment_id=$3 AND deleted_at IS NULL`,
          [input.visitId, partnerId, input.assignmentId],
        );
        if (!visit.rows[0]) throw new ApiError("not_found", "Field visit not found for assignment");
      }
      const object = await client.query<{ id: string }>(
        `INSERT INTO workflow.business_objects
          (partner_id,object_kind,registered_at,created_by,updated_by)
         VALUES ($1,'attachment',transaction_timestamp(),$2,$2)
         RETURNING id`,
        [partnerId, context.actor.userId],
      );
      const businessObjectId = object.rows[0]?.id;
      const attachment = await client.query<{ id: string }>(
        `INSERT INTO document_store.attachments
          (partner_id,category,filename,media_type,classification,current_version_no,status,
           business_object_id,created_by,updated_by)
         VALUES ($1,$2,$3,$4,'confidential',1,'available',$5,$6,$6)
         RETURNING id`,
        [
          partnerId,
          `recovery_photo_${input.purpose}`,
          input.filename,
          input.mediaType,
          businessObjectId,
          context.actor.userId,
        ],
      );
      const attachmentId = attachment.rows[0]?.id;
      if (!businessObjectId || !attachmentId)
        throw new ApiError("internal_error", "Photo metadata was not created");
      const version = await client.query<{ id: string }>(
        `INSERT INTO document_store.attachment_versions
          (partner_id,attachment_id,version_no,object_key,size_bytes,checksum_sha256,uploaded_by,
           uploaded_at,created_by,updated_by)
         VALUES ($1,$2,1,$3,$4,decode($5,'hex'),$6,transaction_timestamp(),$6,$6)
         RETURNING id`,
        [
          partnerId,
          attachmentId,
          input.objectKey,
          input.sizeBytes,
          input.checksumSha256,
          context.actor.userId,
        ],
      );
      await client.query(
        `INSERT INTO document_store.case_attachments
          (partner_id,case_id,attachment_id,purpose,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
        [partnerId, caseId, attachmentId, input.purpose, context.actor.userId],
      );
      if (input.visitId) {
        await client.query(
          `INSERT INTO document_store.visit_attachments
            (partner_id,visit_id,attachment_id,purpose,created_by,updated_by)
           VALUES ($1,$2,$3,$4,$5,$5) RETURNING id`,
          [partnerId, input.visitId, attachmentId, input.purpose, context.actor.userId],
        );
      }
      await timeline(
        client,
        current,
        context,
        "photo.upload",
        attachmentId,
        current.status_id,
        current.status_id,
        {
          purpose: input.purpose,
          versionId: version.rows[0]?.id,
          device: input.device ?? null,
          location: input.location ?? null,
        },
      );
      return {
        caseId,
        attachmentId,
        purpose: input.purpose,
        objectKey: input.objectKey,
        transactionStatus: "committed" as const,
      };
    });
  }
}
