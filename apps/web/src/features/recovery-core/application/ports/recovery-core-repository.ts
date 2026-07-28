import type {
  Assignment,
  ContactAttempt,
  FieldVisit,
  MutationResult,
  PromiseToPay,
  RecoveryCase,
  TimelineEvent,
  VisitResult,
  WorkflowTransition,
} from "../../domain/entities";
export interface CaseListParams {
  readonly partnerId: string;
  readonly limit: number;
  readonly cursor: string | null;
  readonly statusId?: string | undefined;
  readonly priority?: string | undefined;
  readonly customerId?: string | undefined;
  readonly branchId?: string | undefined;
}
export interface TimelineCursor {
  readonly occurredAt: string;
  readonly id: string;
}
export interface TimelineListParams {
  readonly partnerId: string;
  readonly caseId: string;
  readonly limit: number;
  readonly before: TimelineCursor | null;
  readonly eventType?: string | undefined;
  readonly sourceType?: string | undefined;
}
export interface NewCaseRecord {
  readonly partnerId: string;
  readonly branchId: string;
  readonly customerId: string;
  readonly contractId?: string | null | undefined;
  readonly statusId: string;
  readonly priority: string;
  readonly openedAt: string;
  readonly nextActionAt: string;
  readonly businessObjectId: string;
  readonly createdBy: string;
}
export interface UpdateCaseRecord {
  readonly partnerId: string;
  readonly expectedVersionNo: number;
  readonly priority?: string | undefined;
  readonly nextActionAt?: string | undefined;
  readonly contractId?: string | null | undefined;
  readonly updatedBy: string | null;
}
export interface NewTimelineRecord {
  readonly partnerId: string;
  readonly caseId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly actorUserId: string | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly summary: string;
  readonly payloadJson: Record<string, unknown>;
  readonly schemaVersion: number;
  readonly eventVersionId: string;
  readonly correlationId: string;
  readonly causationId: string;
  readonly visibilityCode: string;
  readonly createdBy: string;
}
export interface NewAssignmentRecord {
  readonly partnerId: string;
  readonly caseId: string;
  readonly agentId: string;
  readonly teamId?: string | null | undefined;
  readonly statusId: string;
  readonly assignedAt: string;
  readonly dueAt: string;
  readonly businessObjectId: string;
  readonly createdBy: string;
}
export interface NewFieldVisitRecord {
  readonly partnerId: string;
  readonly assignmentId: string;
  readonly scheduledAt: string;
  readonly outcomeCode: string;
  readonly businessObjectId: string;
  readonly createdBy: string;
}
export interface FieldVisitCheckpointRecord {
  readonly partnerId: string;
  readonly expectedVersionNo: number;
  readonly checkpoint: "check_in" | "check_out";
  readonly occurredAt: string;
  readonly updatedBy: string | null;
}
export interface NewVisitResultRecord {
  readonly partnerId: string;
  readonly visitId: string;
  readonly outcomeType: string;
  readonly payloadJson: Record<string, unknown>;
  readonly schemaVersion: number;
  readonly createdBy: string;
}
export interface NewContactAttemptRecord {
  readonly partnerId: string;
  readonly visitId?: string | null | undefined;
  readonly customerContactId: string;
  readonly channelCode: string;
  readonly outcomeCode: string;
  readonly occurredAt: string;
  readonly actorMembershipId: string;
  readonly createdBy: string;
}
export interface NewPromiseRecord {
  readonly partnerId: string;
  readonly caseId: string;
  readonly visitId?: string | null | undefined;
  readonly customerId: string;
  readonly promisedAmount: number;
  readonly currencyCode: string;
  readonly dueAt: string;
  readonly statusCode: string;
  readonly createdBy: string;
}
export interface UpdatePromiseRecord {
  readonly partnerId: string;
  readonly expectedVersionNo: number;
  readonly promisedAmount?: number | undefined;
  readonly dueAt?: string | undefined;
  readonly updatedBy: string | null;
}
export interface RecoveryCoreRepository {
  listCases(p: CaseListParams): Promise<readonly RecoveryCase[]>;
  findCaseById(id: string): Promise<RecoveryCase | null>;
  createCase(i: NewCaseRecord): Promise<RecoveryCase>;
  updateCase(id: string, i: UpdateCaseRecord): Promise<MutationResult<RecoveryCase>>;
  listTimeline(p: TimelineListParams): Promise<readonly TimelineEvent[]>;
  appendTimelineEvent(i: NewTimelineRecord): Promise<TimelineEvent>;
  createAssignment(i: NewAssignmentRecord): Promise<Assignment>;
  createFieldVisit(i: NewFieldVisitRecord): Promise<FieldVisit>;
  updateFieldVisitCheckpoint(
    id: string,
    i: FieldVisitCheckpointRecord,
  ): Promise<MutationResult<FieldVisit>>;
  appendVisitResult(i: NewVisitResultRecord): Promise<VisitResult>;
  createContactAttempt(i: NewContactAttemptRecord): Promise<ContactAttempt>;
  createPromiseToPay(i: NewPromiseRecord): Promise<PromiseToPay>;
  updatePromiseToPay(id: string, i: UpdatePromiseRecord): Promise<MutationResult<PromiseToPay>>;
  listWorkflowTransitions(
    partnerId: string,
    instanceId: string,
  ): Promise<readonly WorkflowTransition[]>;
}
