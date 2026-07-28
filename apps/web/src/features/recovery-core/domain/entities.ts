export interface RecoveryCase {
  readonly id: string;
  readonly partnerId: string;
  readonly branchId: string;
  readonly customerId: string;
  readonly contractId: string | null;
  readonly statusId: string;
  readonly priority: string;
  readonly openedAt: string;
  readonly nextActionAt: string;
  readonly closedAt: string | null;
  readonly versionNo: number;
  readonly businessObjectId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface TimelineEvent {
  readonly id: string;
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
  readonly createdAt: string;
}
export interface Assignment {
  readonly id: string;
  readonly partnerId: string;
  readonly caseId: string;
  readonly agentId: string;
  readonly teamId: string | null;
  readonly statusId: string;
  readonly assignedAt: string;
  readonly dueAt: string;
  readonly completedAt: string | null;
  readonly versionNo: number;
  readonly businessObjectId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface FieldVisit {
  readonly id: string;
  readonly partnerId: string;
  readonly assignmentId: string;
  readonly scheduledAt: string;
  readonly startedAt: string | null;
  readonly completedAt: string | null;
  readonly outcomeCode: string;
  readonly versionNo: number;
  readonly businessObjectId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface VisitResult {
  readonly id: string;
  readonly partnerId: string;
  readonly visitId: string | null;
  readonly outcomeType: string;
  readonly payloadJson: Record<string, unknown>;
  readonly schemaVersion: number;
  readonly createdAt: string;
}
export interface ContactAttempt {
  readonly id: string;
  readonly partnerId: string;
  readonly visitId: string | null;
  readonly customerContactId: string;
  readonly channelCode: string;
  readonly outcomeCode: string;
  readonly occurredAt: string;
  readonly actorMembershipId: string;
  readonly createdAt: string;
}
export interface PromiseToPay {
  readonly id: string;
  readonly partnerId: string;
  readonly caseId: string;
  readonly visitId: string | null;
  readonly customerId: string;
  readonly promisedAmount: number;
  readonly currencyCode: string;
  readonly dueAt: string;
  readonly statusCode: string;
  readonly versionNo: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}
export interface WorkflowTransition {
  readonly id: string;
  readonly fromStateId: string | null;
  readonly toStateId: string;
  readonly actionCode: string;
  readonly permissionCode: string;
}
export type MutationResult<T> =
  | { readonly outcome: "updated"; readonly value: T }
  | { readonly outcome: "not_found" }
  | { readonly outcome: "version_conflict" };
