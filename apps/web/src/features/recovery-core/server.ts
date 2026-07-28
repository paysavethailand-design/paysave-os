import { ConsoleAuditSink } from "@paysave/observability";
import { databaseProvider } from "@/shared/providers/database/server";
import {
  appendTimeline,
  appendVisitResult,
  checkpointFieldVisit,
  createAssignment,
  createCase,
  createContactAttempt,
  createFieldVisit,
  createPromise,
  getCase,
  listCases,
  listTimeline,
  listTransitions,
  rejectAtomicLifecycleCommand,
  updateCase,
  updatePromise,
  validateWorkflowTransitionAudited,
  type RequestContext,
} from "./application/recovery-service";
import {
  closeOperationSchema,
  decideReviewOperationSchema,
  submitReviewOperationSchema,
} from "./application/recovery-schemas";
import { executeLifecycleCommand } from "./application/workflow-runtime-service";
import type {
  CloseOperationCommand,
  DecideReviewCommand,
  OperationMvpAction,
  SubmitReviewCommand,
} from "./application/ports/operation-mvp-repository";
import type { RecoveryCoreRepository } from "./application/ports/recovery-core-repository";
import type { AtomicGapAction } from "./domain/codes";
import type { WorkflowTransition } from "./domain/entities";

const auditSink = new ConsoleAuditSink();
async function repository(): Promise<RecoveryCoreRepository> {
  return databaseProvider().repositories.recoveryCore();
}
export const listCasesUseCase = async (raw: unknown, ctx: RequestContext) =>
  listCases(raw, ctx, { repository: await repository(), auditSink });
export const getCaseUseCase = async (id: string, ctx: RequestContext) =>
  getCase(id, ctx, { repository: await repository(), auditSink });
export const createCaseUseCase = async (raw: unknown, ctx: RequestContext) =>
  createCase(raw, ctx, { repository: await repository(), auditSink });
export const updateCaseUseCase = async (id: string, raw: unknown, ctx: RequestContext) =>
  updateCase(id, raw, ctx, { repository: await repository(), auditSink });
export const listTimelineUseCase = async (caseId: string, raw: unknown, ctx: RequestContext) =>
  listTimeline(caseId, raw, ctx, { repository: await repository(), auditSink });
export const appendTimelineUseCase = async (caseId: string, raw: unknown, ctx: RequestContext) =>
  appendTimeline(caseId, raw, ctx, { repository: await repository(), auditSink });
export const createAssignmentUseCase = async (raw: unknown, ctx: RequestContext) =>
  createAssignment(raw, ctx, { repository: await repository(), auditSink });
export const createFieldVisitUseCase = async (raw: unknown, ctx: RequestContext) =>
  createFieldVisit(raw, ctx, { repository: await repository(), auditSink });
export const checkpointFieldVisitUseCase = async (
  id: string,
  kind: "check_in" | "check_out",
  raw: unknown,
  ctx: RequestContext,
) => checkpointFieldVisit(id, kind, raw, ctx, { repository: await repository(), auditSink });
export const appendVisitResultUseCase = async (id: string, raw: unknown, ctx: RequestContext) =>
  appendVisitResult(id, raw, ctx, { repository: await repository(), auditSink });
export const createContactAttemptUseCase = async (raw: unknown, ctx: RequestContext) =>
  createContactAttempt(raw, ctx, { repository: await repository(), auditSink });
export const createPromiseUseCase = async (raw: unknown, ctx: RequestContext) =>
  createPromise(raw, ctx, { repository: await repository(), auditSink });
export const updatePromiseUseCase = async (id: string, raw: unknown, ctx: RequestContext) =>
  updatePromise(id, raw, ctx, { repository: await repository(), auditSink });
export const listTransitionsUseCase = async (
  instanceId: string,
  partnerId: string | null,
  ctx: RequestContext,
) => listTransitions(instanceId, partnerId, ctx, { repository: await repository(), auditSink });
export const validateTransitionUseCase = (
  transitions: readonly WorkflowTransition[],
  currentStateId: string,
  actionCode: string,
  ctx: RequestContext,
) => validateWorkflowTransitionAudited(transitions, currentStateId, actionCode, ctx, auditSink);
export const rejectAtomicLifecycleUseCase = async (
  action: AtomicGapAction,
  resourceId: string,
  ctx: RequestContext,
) => rejectAtomicLifecycleCommand(action, resourceId, ctx, auditSink);
/** Executes a lifecycle command through the PostgreSQL transaction adapter. */
export const executeLifecycleUseCase = async (
  action: AtomicGapAction,
  resourceId: string,
  raw: unknown,
  ctx: RequestContext,
) =>
  executeLifecycleCommand(action, resourceId, raw, ctx, {
    repository: databaseProvider().unitOfWork.recoveryWorkflow(),
    auditSink,
  });

/** Executes the review/approval MVP operations through one PostgreSQL transaction boundary. */
export const executeOperationMvpUseCase = async (
  action: OperationMvpAction,
  caseId: string,
  raw: unknown,
  ctx: RequestContext,
) => {
  const repository = databaseProvider().unitOfWork.operationMvp();
  if (action === "case.submit_review") {
    const input: SubmitReviewCommand = submitReviewOperationSchema.parse(raw);
    return repository.submitReview(caseId, input, ctx);
  }
  if (action === "case.approve" || action === "case.reject") {
    const base = decideReviewOperationSchema.parse(raw);
    const input: DecideReviewCommand = {
      ...base,
      decision: action === "case.approve" ? "approved" : "rejected",
    };
    return repository.decideReview(caseId, input, ctx);
  }
  const input: CloseOperationCommand = closeOperationSchema.parse(raw);
  return repository.closeCase(caseId, input, ctx);
};
export {
  ATOMIC_TRANSACTION_ERROR_CODE,
  ATOMIC_TRANSACTION_REASON,
  RECOVERY_PERMISSIONS,
} from "./domain/codes";
export type { AtomicGapAction } from "./domain/codes";
export type { OperationMvpAction } from "./application/ports/operation-mvp-repository";
