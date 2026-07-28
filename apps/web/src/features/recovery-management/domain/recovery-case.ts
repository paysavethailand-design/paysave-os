export type RecoveryStage =
  "new" | "contacting" | "field_visit" | "promise_to_pay" | "approval" | "resolved";
export type RecoveryPriority = "critical" | "high" | "medium" | "low";
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";
export interface CaseSummary {
  readonly source: "mock" | "staging";
  readonly id: string;
  readonly customerName: string;
  readonly phoneMasked: string;
  readonly stage: RecoveryStage;
  readonly priority: RecoveryPriority;
  readonly assignedAgentId: string | null;
  readonly assignedAgentName: string;
  readonly daysPastDue: number;
  readonly outstanding: number;
  readonly nextAction: string;
  readonly branch: string;
  readonly updatedAt: string;
}
export interface RecoveryAgent {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly activeCases: number;
  readonly capacity: number;
  readonly zone: string;
}
export interface TimelineEvent {
  readonly id: string;
  readonly type: "status" | "contact" | "visit" | "promise" | "approval" | "document";
  readonly title: string;
  readonly description: string;
  readonly actor: string;
  readonly occurredAt: string;
  readonly tone: Tone;
}
export interface ContactAttempt {
  readonly id: string;
  readonly channel: "phone" | "line" | "sms" | "email";
  readonly outcome: "connected" | "no_answer" | "wrong_number" | "callback";
  readonly note: string;
  readonly occurredAt: string;
  readonly actor: string;
}
export interface PromiseToPay {
  readonly id: string;
  readonly amount: number;
  readonly dueDate: string;
  readonly note: string;
  readonly status: "active" | "kept" | "broken";
}
export interface FieldVisit {
  readonly id: string;
  readonly outcome: "met_customer" | "not_home" | "moved" | "refused";
  readonly note: string;
  readonly occurredAt: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracyMeters: number;
  readonly officer: string;
}
export interface RecoveryDocument {
  readonly id: string;
  readonly name: string;
  readonly type: string;
  readonly pages: number;
  readonly size: string;
  readonly uploadedAt: string;
}
export interface AssetInformation {
  readonly category: string;
  readonly brand: string;
  readonly model: string;
  readonly registration: string;
  readonly serialMasked: string;
  readonly estimatedValue: number;
  readonly condition: string;
  readonly status: string;
}
export interface ApprovalState {
  readonly status: "pending" | "approved" | "rejected";
  readonly type: string;
  readonly requestedBy: string;
  readonly requestedAt: string;
  readonly note: string;
}
export interface CaseDetail extends CaseSummary {
  readonly nationalIdMasked: string;
  readonly emailMasked: string;
  readonly address: string;
  readonly contractNumber: string;
  readonly originalPrincipal: number;
  readonly paidAmount: number;
  readonly asset: AssetInformation;
  readonly timeline: readonly TimelineEvent[];
  readonly contacts: readonly ContactAttempt[];
  readonly promiseToPay: PromiseToPay | null;
  readonly fieldVisits: readonly FieldVisit[];
  readonly documents: readonly RecoveryDocument[];
  readonly approval: ApprovalState;
}
export interface AddContactInput {
  readonly channel: ContactAttempt["channel"];
  readonly outcome: ContactAttempt["outcome"];
  readonly note: string;
}
export interface PromiseInput {
  readonly amount: number;
  readonly dueDate: string;
  readonly note: string;
}
export interface FieldVisitInput {
  readonly outcome: FieldVisit["outcome"];
  readonly note: string;
}
export interface ApprovalInput {
  readonly decision: "approved" | "rejected";
  readonly note: string;
}
export const stageLabels: Record<RecoveryStage, string> = {
  new: "เคสใหม่",
  contacting: "กำลังติดต่อ",
  field_visit: "ลงพื้นที่",
  promise_to_pay: "สัญญาชำระ",
  approval: "รออนุมัติ",
  resolved: "เสร็จสิ้น",
};
export const priorityLabels: Record<RecoveryPriority, string> = {
  critical: "วิกฤต",
  high: "สูง",
  medium: "กลาง",
  low: "ต่ำ",
};
export function formatBaht(value: number) {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}
