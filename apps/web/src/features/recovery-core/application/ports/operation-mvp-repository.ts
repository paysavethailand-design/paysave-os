import type { RequestContext } from "../recovery-service";

export type OperationMvpAction =
  "case.submit_review" | "case.approve" | "case.reject" | "case.close";
export interface SubmitReviewCommand {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly reasonCode: string;
  readonly policyVersionId: string;
  readonly policyStepId: string;
  readonly dueAt: string;
}
export interface DecideReviewCommand {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly approvalRequestId: string;
  readonly approvalStepId: string;
  readonly actorMembershipId: string;
  readonly decision: "approved" | "rejected";
  readonly reasonCode: string;
  readonly evidence: string;
}
export interface CloseOperationCommand {
  readonly expectedVersionNo: number;
  readonly targetStatusId: string;
  readonly reasonCode: string;
  readonly approvalRequestId?: string;
  readonly currencyCode?: string;
}
export type OperationMvpInput = SubmitReviewCommand | DecideReviewCommand | CloseOperationCommand;
export interface OperationMvpRepository {
  submitReview(
    caseId: string,
    input: SubmitReviewCommand,
    context: RequestContext,
  ): Promise<unknown>;
  decideReview(
    caseId: string,
    input: DecideReviewCommand,
    context: RequestContext,
  ): Promise<unknown>;
  closeCase(
    caseId: string,
    input: CloseOperationCommand,
    context: RequestContext,
  ): Promise<unknown>;
}
