import type {
  AddContactInput,
  ApprovalInput,
  CaseDetail,
  CaseSummary,
  FieldVisitInput,
  PromiseInput,
  RecoveryAgent,
} from "../../domain/recovery-case";
export interface RecoveryRepository {
  listCases(): Promise<readonly CaseSummary[]>;
  getCase(caseId: string): Promise<CaseDetail | null>;
  listAgents(): Promise<readonly RecoveryAgent[]>;
  assignCase(caseId: string, agentId: string): Promise<CaseDetail>;
  addContactAttempt(caseId: string, input: AddContactInput): Promise<CaseDetail>;
  createPromiseToPay(caseId: string, input: PromiseInput): Promise<CaseDetail>;
  recordFieldVisit(caseId: string, input: FieldVisitInput): Promise<CaseDetail>;
  resolveApproval(caseId: string, input: ApprovalInput): Promise<CaseDetail>;
}
