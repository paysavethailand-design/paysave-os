import { Buffer } from "node:buffer";
import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { z } from "zod";
import { ApiError } from "@/shared/lib/api-error";
import { toBoundedPage, type BoundedPage } from "@/shared/lib/pagination";
import {
  ATOMIC_TRANSACTION_ERROR_CODE,
  ATOMIC_TRANSACTION_REASON,
  type AtomicGapAction,
} from "../domain/codes";
import type {
  Assignment,
  ContactAttempt,
  FieldVisit,
  PromiseToPay,
  RecoveryCase,
  TimelineEvent,
  VisitResult,
  WorkflowTransition,
} from "../domain/entities";
import type { RecoveryCoreRepository, TimelineCursor } from "./ports/recovery-core-repository";
import {
  caseListFilterSchema,
  checkpointSchema,
  createAssignmentSchema,
  createCaseSchema,
  createContactAttemptSchema,
  createFieldVisitSchema,
  createPromiseToPaySchema,
  createTimelineEventSchema,
  createVisitResultSchema,
  timelineFilterSchema,
  updateCaseSchema,
  updatePromiseToPaySchema,
} from "./recovery-schemas";

export interface RequestContext {
  readonly actor: AuthContext;
  readonly correlationId: string;
}
interface Deps {
  readonly repository: RecoveryCoreRepository;
  readonly auditSink: AuditSink;
}
const timelineCursorSchema = z.object({
  occurredAt: z.iso.datetime({ offset: true }),
  id: z.uuid(),
});

function scope(actor: AuthContext, requested: string | null | undefined): string {
  const value = resolveWritePartnerId(actor, requested ?? null);
  if (!value.ok) throw new ApiError("forbidden", `Cannot resolve target partner: ${value.reason}`);
  return value.partnerId;
}
async function audit(
  sink: AuditSink,
  ctx: RequestContext,
  action: string,
  resourceType: string,
  resourceId: string | null,
  partnerId: string | null,
  outcome: "success" | "denied" | "failure",
  reason?: string,
) {
  await sink.record({
    correlationId: ctx.correlationId,
    actorType: "user",
    actorUserId: ctx.actor.userId,
    partnerId,
    action,
    resourceType,
    resourceId,
    outcome,
    ...(reason ? { reason } : {}),
  });
}
function mapMutation<T>(
  result:
    { outcome: "updated"; value: T } | { outcome: "not_found" } | { outcome: "version_conflict" },
  label: string,
): T {
  if (result.outcome === "updated") return result.value;
  if (result.outcome === "version_conflict")
    throw new ApiError("conflict", `${label} was modified by another request`);
  throw new ApiError("not_found", `${label} not found`);
}
async function loadCase(id: string, repo: RecoveryCoreRepository): Promise<RecoveryCase> {
  const value = await repo.findCaseById(id);
  if (!value) throw new ApiError("not_found", `Case not found: ${id}`);
  return value;
}
export function encodeTimelineCursor(cursor: TimelineCursor): string {
  return Buffer.from(JSON.stringify(timelineCursorSchema.parse(cursor)), "utf8").toString(
    "base64url",
  );
}
export function decodeTimelineCursor(value: string): TimelineCursor {
  try {
    return timelineCursorSchema.parse(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
  } catch {
    throw new ApiError("validation_failed", "Timeline cursor is invalid");
  }
}

export async function listCases(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<BoundedPage<RecoveryCase>> {
  const p = caseListFilterSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const rows = await deps.repository.listCases({ ...p, partnerId });
  const page = toBoundedPage(rows, p.limit);
  await audit(
    deps.auditSink,
    ctx,
    "recovery.case.search",
    "recovery.cases",
    null,
    partnerId,
    "success",
  );
  return page;
}
export async function getCase(id: string, ctx: RequestContext, deps: Deps): Promise<RecoveryCase> {
  const value = await loadCase(id, deps.repository);
  const partnerId = scope(ctx.actor, value.partnerId);
  await audit(
    deps.auditSink,
    ctx,
    "recovery.case.read",
    "recovery.cases",
    id,
    partnerId,
    "success",
  );
  return value;
}
export async function createCase(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<RecoveryCase> {
  const p = createCaseSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.createCase({ ...p, partnerId, createdBy: ctx.actor.userId });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.case.create",
    "recovery.cases",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function updateCase(
  id: string,
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<RecoveryCase> {
  const p = updateCaseSchema.parse(raw);
  const existing = await loadCase(id, deps.repository);
  const partnerId = scope(ctx.actor, existing.partnerId);
  const value = mapMutation(
    await deps.repository.updateCase(id, { ...p, partnerId, updatedBy: ctx.actor.userId }),
    "Case",
  );
  await audit(
    deps.auditSink,
    ctx,
    "recovery.case.update",
    "recovery.cases",
    id,
    partnerId,
    "success",
  );
  return value;
}
export async function listTimeline(
  caseId: string,
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<{ items: readonly TimelineEvent[]; nextCursor: string | null }> {
  const p = timelineFilterSchema.parse(raw);
  const existing = await loadCase(caseId, deps.repository);
  const partnerId = scope(ctx.actor, existing.partnerId);
  const before = p.before ? decodeTimelineCursor(p.before) : null;
  const rows = await deps.repository.listTimeline({ ...p, before, partnerId, caseId });
  const more = rows.length > p.limit;
  const items = more ? rows.slice(0, p.limit) : rows;
  const last = items[items.length - 1];
  await audit(
    deps.auditSink,
    ctx,
    "recovery.timeline.list",
    "recovery.case_timeline_events",
    caseId,
    partnerId,
    "success",
  );
  return {
    items,
    nextCursor:
      more && last ? encodeTimelineCursor({ occurredAt: last.occurredAt, id: last.id }) : null,
  };
}
export async function appendTimeline(
  caseId: string,
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<TimelineEvent> {
  const p = createTimelineEventSchema.parse(raw);
  const correlationId = z.uuid().parse(ctx.correlationId);
  const existing = await loadCase(caseId, deps.repository);
  const partnerId = scope(ctx.actor, p.partnerId ?? existing.partnerId);
  if (partnerId !== existing.partnerId)
    throw new ApiError("forbidden", "Case is outside the requested partner");
  const value = await deps.repository.appendTimelineEvent({
    ...p,
    partnerId,
    caseId,
    actorUserId: ctx.actor.userId,
    correlationId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.timeline.append",
    "recovery.case_timeline_events",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function createAssignment(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<Assignment> {
  const p = createAssignmentSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.createAssignment({
    ...p,
    partnerId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.assignment.create",
    "workforce.assignments",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function createFieldVisit(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<FieldVisit> {
  const p = createFieldVisitSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.createFieldVisit({
    ...p,
    partnerId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.field_visit.create",
    "workforce.field_visits",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function checkpointFieldVisit(
  id: string,
  checkpoint: "check_in" | "check_out",
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<FieldVisit> {
  const p = checkpointSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = mapMutation(
    await deps.repository.updateFieldVisitCheckpoint(id, {
      ...p,
      partnerId,
      checkpoint,
      updatedBy: ctx.actor.userId,
    }),
    "Field visit",
  );
  await audit(
    deps.auditSink,
    ctx,
    `recovery.field_visit.${checkpoint}`,
    "workforce.field_visits",
    id,
    partnerId,
    "success",
  );
  return value;
}
export async function appendVisitResult(
  visitId: string,
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<VisitResult> {
  const p = createVisitResultSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.appendVisitResult({
    ...p,
    partnerId,
    visitId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.field_visit.result",
    "workforce.field_visit_outcomes",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function createContactAttempt(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<ContactAttempt> {
  const p = createContactAttemptSchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.createContactAttempt({
    ...p,
    partnerId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.contact_attempt.create",
    "workforce.contact_attempts",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function createPromise(
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<PromiseToPay> {
  const p = createPromiseToPaySchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = await deps.repository.createPromiseToPay({
    ...p,
    partnerId,
    createdBy: ctx.actor.userId,
  });
  await audit(
    deps.auditSink,
    ctx,
    "recovery.promise.create",
    "workforce.promises_to_pay",
    value.id,
    partnerId,
    "success",
  );
  return value;
}
export async function updatePromise(
  id: string,
  raw: unknown,
  ctx: RequestContext,
  deps: Deps,
): Promise<PromiseToPay> {
  const p = updatePromiseToPaySchema.parse(raw);
  const partnerId = scope(ctx.actor, p.partnerId);
  const value = mapMutation(
    await deps.repository.updatePromiseToPay(id, { ...p, partnerId, updatedBy: ctx.actor.userId }),
    "Promise to pay",
  );
  await audit(
    deps.auditSink,
    ctx,
    "recovery.promise.update",
    "workforce.promises_to_pay",
    id,
    partnerId,
    "success",
  );
  return value;
}
export function validateWorkflowTransition(
  transitions: readonly WorkflowTransition[],
  currentStateId: string,
  actionCode: string,
  permissions: readonly string[],
): WorkflowTransition {
  const found = transitions.find(
    (t) => t.fromStateId === currentStateId && t.actionCode === actionCode,
  );
  if (!found)
    throw new ApiError(
      "validation_failed",
      `Workflow transition is not allowed from state ${currentStateId}`,
    );
  if (!permissions.includes(found.permissionCode))
    throw new ApiError("forbidden", `Missing transition permission: ${found.permissionCode}`);
  return found;
}
export async function validateWorkflowTransitionAudited(
  transitions: readonly WorkflowTransition[],
  currentStateId: string,
  actionCode: string,
  ctx: RequestContext,
  sink: AuditSink,
): Promise<WorkflowTransition> {
  try {
    const value = validateWorkflowTransition(
      transitions,
      currentStateId,
      actionCode,
      ctx.actor.permissions,
    );
    await audit(
      sink,
      ctx,
      "recovery.workflow.validate",
      "workflow.transitions",
      value.id,
      ctx.actor.activePartnerId,
      "success",
    );
    return value;
  } catch (error) {
    await audit(
      sink,
      ctx,
      "recovery.workflow.validate",
      "workflow.transitions",
      null,
      ctx.actor.activePartnerId,
      "failure",
      error instanceof ApiError ? error.code : "validation_failed",
    );
    throw error;
  }
}
export async function listTransitions(
  instanceId: string,
  requestedPartnerId: string | null,
  ctx: RequestContext,
  deps: Deps,
): Promise<readonly WorkflowTransition[]> {
  const partnerId = scope(ctx.actor, requestedPartnerId);
  const values = await deps.repository.listWorkflowTransitions(partnerId, instanceId);
  await audit(
    deps.auditSink,
    ctx,
    "recovery.workflow.transitions.list",
    "workflow.instances",
    instanceId,
    partnerId,
    "success",
  );
  return values;
}
export async function rejectAtomicLifecycleCommand(
  action: AtomicGapAction,
  resourceId: string,
  ctx: RequestContext,
  sink: AuditSink,
): Promise<never> {
  await audit(
    sink,
    ctx,
    `recovery.${action}`,
    action.startsWith("assignment")
      ? "workforce.assignments"
      : action.startsWith("promise")
        ? "workforce.promises_to_pay"
        : action.startsWith("workflow")
          ? "workflow.instances"
          : "recovery.cases",
    resourceId,
    ctx.actor.activePartnerId,
    "denied",
    "atomic_transaction_waiver_required",
  );
  throw new ApiError(ATOMIC_TRANSACTION_ERROR_CODE, ATOMIC_TRANSACTION_REASON);
}
