import type { RecoveryRepository } from "../../application/ports/recovery-repository";
import type {
  AddContactInput,
  ApprovalInput,
  CaseDetail,
  CaseSummary,
  FieldVisitInput,
  PromiseInput,
  RecoveryAgent,
  RecoveryPriority,
  TimelineEvent,
} from "../../domain/recovery-case";

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface ApiEnvelope<T> {
  readonly data: T;
  readonly meta: { readonly correlationId: string; readonly nextCursor?: string | null };
}

interface RecoveryCaseRow {
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

interface TimelineRow {
  readonly id: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly actorUserId: string | null;
  readonly summary: string;
}

function priority(value: string): RecoveryPriority {
  return value === "critical" || value === "high" || value === "medium" || value === "low"
    ? value
    : "medium";
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function opaqueLabel(prefix: string, id: string): string {
  return `${prefix} ••••${id.slice(-4)}`;
}

function toSummary(row: RecoveryCaseRow): CaseSummary {
  const now = Date.now();
  const due = Date.parse(row.nextActionAt);
  return {
    source: "staging",
    id: row.id,
    customerName: opaqueLabel("ลูกค้า", row.customerId),
    phoneMasked: "ไม่เปิดเผยผ่าน Recovery API",
    stage: row.closedAt ? "resolved" : "new",
    priority: priority(row.priority),
    assignedAgentId: null,
    assignedAgentName: "ยังไม่โหลดจาก Workforce API",
    daysPastDue: Number.isFinite(due) ? Math.max(0, Math.floor((now - due) / 86_400_000)) : 0,
    outstanding: 0,
    nextAction: dateLabel(row.nextActionAt),
    branch: row.branchId,
    updatedAt: dateLabel(row.updatedAt),
  };
}

function timelineType(value: string): TimelineEvent["type"] {
  if (value.includes("contact")) return "contact";
  if (value.includes("visit")) return "visit";
  if (value.includes("promise")) return "promise";
  if (value.includes("approval")) return "approval";
  if (value.includes("document")) return "document";
  return "status";
}

async function parseEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  if (!response.ok) {
    if (response.status === 404) throw new Error("staging_runtime_not_found");
    throw new Error(`staging_runtime_http_error:${response.status}`);
  }
  return (await response.json()) as ApiEnvelope<T>;
}

function unsupported(command: string): never {
  throw new Error(`staging_runtime_command_not_supported:${command}`);
}

/** Browser-side adapter for the existing authenticated Recovery Core API. No mock fallback is allowed. */
export class StagingRecoveryRepository implements RecoveryRepository {
  private readonly fetcher: Fetcher;

  constructor(options: { readonly fetcher?: Fetcher } = {}) {
    this.fetcher = options.fetcher ?? fetch;
  }

  async listCases(): Promise<readonly CaseSummary[]> {
    const response = await this.fetcher("/api/v1/recovery/cases?limit=100", {
      method: "GET",
      credentials: "same-origin",
      headers: { accept: "application/json" },
    });
    return (await parseEnvelope<readonly RecoveryCaseRow[]>(response)).data.map(toSummary);
  }

  async getCase(caseId: string): Promise<CaseDetail | null> {
    try {
      const encoded = encodeURIComponent(caseId);
      const [caseResponse, timelineResponse] = await Promise.all([
        this.fetcher(`/api/v1/recovery/cases/${encoded}`, {
          method: "GET",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        }),
        this.fetcher(`/api/v1/recovery/cases/${encoded}/timeline?limit=100`, {
          method: "GET",
          credentials: "same-origin",
          headers: { accept: "application/json" },
        }),
      ]);
      const row = (await parseEnvelope<RecoveryCaseRow>(caseResponse)).data;
      const timelineRows = (await parseEnvelope<readonly TimelineRow[]>(timelineResponse)).data;
      const summary = toSummary(row);
      return {
        ...summary,
        nationalIdMasked: "ไม่เปิดเผยผ่าน Recovery API",
        emailMasked: "ไม่เปิดเผยผ่าน Recovery API",
        address: "ไม่เปิดเผยผ่าน Recovery API",
        contractNumber: row.contractId ? opaqueLabel("สัญญา", row.contractId) : "ไม่มีสัญญา",
        originalPrincipal: 0,
        paidAmount: 0,
        asset: {
          category: "ไม่พร้อมใช้งาน",
          brand: "—",
          model: "—",
          registration: "—",
          serialMasked: "—",
          estimatedValue: 0,
          condition: "ไม่พร้อมใช้งาน",
          status: "ไม่พร้อมใช้งาน",
        },
        timeline: timelineRows.map((event) => ({
          id: event.id,
          type: timelineType(event.eventType),
          title: event.summary,
          description: event.eventType,
          actor: event.actorUserId ? opaqueLabel("ผู้ใช้", event.actorUserId) : "ระบบ",
          occurredAt: dateLabel(event.occurredAt),
          tone: "neutral",
        })),
        contacts: [],
        promiseToPay: null,
        fieldVisits: [],
        documents: [],
        approval: {
          status: "pending",
          type: "ยังไม่มี Staging approval read model",
          requestedBy: "—",
          requestedAt: "—",
          note: "คำสั่งอนุมัติถูกปิดแบบ fail-closed จนกว่าจะมี API contract ที่รองรับ",
        },
      };
    } catch (error) {
      if (error instanceof Error && error.message === "staging_runtime_not_found") return null;
      throw error;
    }
  }

  async listAgents(): Promise<readonly RecoveryAgent[]> {
    return [];
  }

  async assignCase(caseId: string, agentId: string): Promise<CaseDetail> {
    void caseId;
    void agentId;
    return unsupported("assignment");
  }

  async addContactAttempt(caseId: string, input: AddContactInput): Promise<CaseDetail> {
    void caseId;
    void input;
    return unsupported("contact_attempt");
  }

  async createPromiseToPay(caseId: string, input: PromiseInput): Promise<CaseDetail> {
    void caseId;
    void input;
    return unsupported("promise_to_pay");
  }

  async recordFieldVisit(caseId: string, input: FieldVisitInput): Promise<CaseDetail> {
    void caseId;
    void input;
    return unsupported("field_visit");
  }

  async resolveApproval(caseId: string, input: ApprovalInput): Promise<CaseDetail> {
    void caseId;
    void input;
    return unsupported("approval");
  }
}

export const recoveryRepository = new StagingRecoveryRepository();
