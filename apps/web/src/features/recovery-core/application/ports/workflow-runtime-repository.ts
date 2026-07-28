import type { z } from "zod";
import {
  assignmentLifecycleSchema,
  caseLifecycleSchema,
  promiseLifecycleSchema,
  workflowTransitionCommandSchema,
} from "../workflow-runtime-schemas";
import type { AtomicGapAction } from "../../domain/codes";
import type { RequestContext } from "../recovery-service";

export type CaseLifecycleInput = z.infer<typeof caseLifecycleSchema>;
export type AssignmentLifecycleInput = z.infer<typeof assignmentLifecycleSchema>;
export type PromiseLifecycleInput = z.infer<typeof promiseLifecycleSchema>;
export type WorkflowTransitionCommandInput = z.infer<typeof workflowTransitionCommandSchema>;
export type WorkflowRuntimeInput =
  | CaseLifecycleInput
  | AssignmentLifecycleInput
  | PromiseLifecycleInput
  | WorkflowTransitionCommandInput;

export interface WorkflowRuntimeResult {
  readonly action: AtomicGapAction;
  readonly resourceId: string;
  readonly transactionStatus: "committed";
  readonly writes: number;
}

/** Transactional port for Recovery lifecycle commands spanning multiple existing tables. */
export interface WorkflowRuntimeRepository {
  execute(
    action: AtomicGapAction,
    resourceId: string,
    input: WorkflowRuntimeInput,
    context: RequestContext,
  ): Promise<WorkflowRuntimeResult>;
}
