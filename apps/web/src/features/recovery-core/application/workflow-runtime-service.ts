import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { AtomicGapAction } from "../domain/codes";
import type { RequestContext } from "./recovery-service";
import type {
  WorkflowRuntimeInput,
  WorkflowRuntimeRepository,
  WorkflowRuntimeResult,
} from "./ports/workflow-runtime-repository";
import {
  assignmentLifecycleSchema,
  caseLifecycleSchema,
  promiseLifecycleSchema,
  workflowTransitionCommandSchema,
} from "./workflow-runtime-schemas";

interface WorkflowRuntimeDependencies {
  readonly repository: WorkflowRuntimeRepository;
  readonly auditSink: AuditSink;
}

/** Validates an action-specific command before opening the database transaction. */
function parseInput(action: AtomicGapAction, raw: unknown): WorkflowRuntimeInput {
  if (action.startsWith("case.")) return caseLifecycleSchema.parse(raw);
  if (action.startsWith("assignment.")) {
    const input = assignmentLifecycleSchema.parse(raw);
    if (action === "assignment.reassign" && !input.targetAgentId) {
      throw new ApiError("validation_failed", "targetAgentId is required for assignment.reassign");
    }
    return input;
  }
  if (action.startsWith("promise.")) return promiseLifecycleSchema.parse(raw);
  return workflowTransitionCommandSchema.parse(raw);
}

/** Executes one lifecycle command and emits an audit record only after the transaction commits. */
export async function executeLifecycleCommand(
  action: AtomicGapAction,
  resourceId: string,
  raw: unknown,
  context: RequestContext,
  dependencies: WorkflowRuntimeDependencies,
): Promise<WorkflowRuntimeResult> {
  const input = parseInput(action, raw);
  const result = await dependencies.repository.execute(action, resourceId, input, context);
  await dependencies.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: context.actor.activePartnerId,
    action: `recovery.${action}`,
    resourceType: action.startsWith("assignment")
      ? "workforce.assignments"
      : action.startsWith("promise")
        ? "workforce.promises_to_pay"
        : action.startsWith("workflow")
          ? "workflow.instances"
          : "recovery.cases",
    resourceId,
    outcome: "success",
  });
  return result;
}
