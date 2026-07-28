import { z } from "zod";
const uuid = z.uuid();
const timestamp = z.iso.datetime({ offset: true });
const text100 = z.string().trim().min(1).max(100);
export const partnerScopeSchema = z.object({ partnerId: uuid.nullable().optional() });
export const caseListFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: uuid.nullable().optional().default(null),
  partnerId: uuid.nullable().optional(),
  statusId: uuid.optional(),
  priority: text100.optional(),
  customerId: uuid.optional(),
  branchId: uuid.optional(),
});
export const createCaseSchema = z
  .object({
    partnerId: uuid.nullable().optional(),
    branchId: uuid,
    customerId: uuid,
    contractId: uuid.nullable().optional(),
    statusId: uuid,
    priority: text100,
    openedAt: timestamp,
    nextActionAt: timestamp,
    businessObjectId: uuid,
  })
  .refine((v) => new Date(v.nextActionAt) >= new Date(v.openedAt), {
    message: "nextActionAt must not precede openedAt",
    path: ["nextActionAt"],
  });
export const updateCaseSchema = z
  .object({
    expectedVersionNo: z.number().int().positive(),
    priority: text100.optional(),
    nextActionAt: timestamp.optional(),
    contractId: uuid.nullable().optional(),
  })
  .refine(
    (v) => v.priority !== undefined || v.nextActionAt !== undefined || v.contractId !== undefined,
    { message: "At least one mutable field is required" },
  );
export const timelineFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  before: z.string().trim().min(1).nullable().optional().default(null),
  eventType: text100.optional(),
  sourceType: text100.optional(),
});
export const createTimelineEventSchema = z.object({
  partnerId: uuid.nullable().optional(),
  eventType: text100,
  occurredAt: timestamp,
  sourceType: text100,
  sourceId: uuid,
  summary: z.string().trim().min(1).max(4000),
  payloadJson: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().positive().default(1),
  eventVersionId: uuid,
  causationId: uuid,
  visibilityCode: text100,
});
export const createAssignmentSchema = z
  .object({
    partnerId: uuid.nullable().optional(),
    caseId: uuid,
    agentId: uuid,
    teamId: uuid.nullable().optional(),
    statusId: uuid,
    assignedAt: timestamp,
    dueAt: timestamp,
    businessObjectId: uuid,
  })
  .refine((v) => new Date(v.dueAt) > new Date(v.assignedAt), {
    message: "dueAt must be after assignedAt",
    path: ["dueAt"],
  });
export const createFieldVisitSchema = z.object({
  partnerId: uuid.nullable().optional(),
  assignmentId: uuid,
  scheduledAt: timestamp,
  outcomeCode: text100,
  businessObjectId: uuid,
});
export const checkpointSchema = z.object({
  partnerId: uuid.nullable().optional(),
  expectedVersionNo: z.number().int().positive(),
  occurredAt: timestamp,
});
export const createVisitResultSchema = z.object({
  partnerId: uuid.nullable().optional(),
  outcomeType: text100,
  payloadJson: z.record(z.string(), z.unknown()),
  schemaVersion: z.number().int().positive().default(1),
});
export const contactChannelSchema = z.enum(["phone", "sms", "line", "visit", "email", "other"]);
export const createContactAttemptSchema = z.object({
  partnerId: uuid.nullable().optional(),
  visitId: uuid.nullable().optional(),
  customerContactId: uuid,
  channelCode: contactChannelSchema,
  outcomeCode: text100,
  occurredAt: timestamp,
  actorMembershipId: uuid,
});
export const createPromiseToPaySchema = z.object({
  partnerId: uuid.nullable().optional(),
  caseId: uuid,
  visitId: uuid.nullable().optional(),
  customerId: uuid,
  promisedAmount: z.number().positive(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
  dueAt: timestamp,
  statusCode: text100.default("active"),
});
export const updatePromiseToPaySchema = z
  .object({
    partnerId: uuid.nullable().optional(),
    expectedVersionNo: z.number().int().positive(),
    promisedAmount: z.number().positive().optional(),
    dueAt: timestamp.optional(),
  })
  .refine((v) => v.promisedAmount !== undefined || v.dueAt !== undefined, {
    message: "At least one mutable field is required",
  });
export const validateTransitionSchema = z.object({ currentStateId: uuid, actionCode: text100 });

export const submitReviewOperationSchema = z.object({
  expectedVersionNo: z.number().int().positive(),
  targetStatusId: uuid,
  reasonCode: text100,
  policyVersionId: uuid,
  policyStepId: uuid,
  dueAt: timestamp,
});
export const decideReviewOperationSchema = z.object({
  expectedVersionNo: z.number().int().positive(),
  targetStatusId: uuid,
  approvalRequestId: uuid,
  approvalStepId: uuid,
  actorMembershipId: uuid,
  reasonCode: text100,
  evidence: z.string().min(1).max(4000),
});
export const closeOperationSchema = z.object({
  expectedVersionNo: z.number().int().positive(),
  targetStatusId: uuid,
  reasonCode: text100,
  approvalRequestId: uuid,
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
});
