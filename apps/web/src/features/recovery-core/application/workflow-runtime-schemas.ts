import { z } from "zod";

const versionSchema = z.int().positive();
const reasonSchema = z.string().trim().min(1).max(100);

export const caseLifecycleSchema = z.object({
  expectedVersionNo: versionSchema,
  targetStatusId: z.uuid(),
  reasonCode: reasonSchema,
});

export const assignmentLifecycleSchema = z.object({
  expectedVersionNo: versionSchema,
  targetStatusId: z.uuid(),
  targetAgentId: z.uuid().optional(),
  targetTeamId: z.uuid().nullable().optional(),
  reasonCode: reasonSchema,
});

export const promiseLifecycleSchema = z.object({
  expectedVersionNo: versionSchema,
  reasonCode: reasonSchema,
});

export const workflowTransitionCommandSchema = z.object({
  instanceId: z.uuid(),
  expectedVersionNo: versionSchema,
  currentStateId: z.uuid(),
  actionCode: z.string().trim().min(1).max(100),
});
