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
  RecoveryStage,
  TimelineEvent,
} from "../../domain/recovery-case";
const agents: readonly RecoveryAgent[] = [
  {
    id: "agent-01",
    name: "วราภรณ์ มีสุข",
    initials: "วม",
    activeCases: 12,
    capacity: 18,
    zone: "กรุงเทพฯ ตะวันออก",
  },
  {
    id: "agent-02",
    name: "ธนภัทร อินทร์แก้ว",
    initials: "ธอ",
    activeCases: 16,
    capacity: 18,
    zone: "กรุงเทพฯ เหนือ",
  },
  {
    id: "agent-03",
    name: "ชลธิชา วงศ์ดี",
    initials: "ชว",
    activeCases: 8,
    capacity: 16,
    zone: "ปทุมธานี",
  },
  {
    id: "agent-04",
    name: "ภาคภูมิ แสงทอง",
    initials: "ภส",
    activeCases: 11,
    capacity: 16,
    zone: "นนทบุรี",
  },
];
const seeds: readonly [
  string,
  string,
  RecoveryStage,
  RecoveryPriority,
  number,
  number,
  string,
  string | null,
][] = [
  [
    "RC-2026-0018",
    "กิตติศักดิ์ พรหมมา",
    "approval",
    "critical",
    67,
    128500,
    "สุขุมวิท",
    "agent-01",
  ],
  ["RC-2026-0017", "พิมพ์ชนก สายใจ", "field_visit", "high", 42, 89200, "รังสิต", "agent-03"],
  ["RC-2026-0016", "วีรชัย ทองมาก", "promise_to_pay", "high", 35, 71600, "ลาดพร้าว", "agent-02"],
  ["RC-2026-0015", "สุชาดา คงมั่น", "contacting", "medium", 28, 45900, "บางนา", null],
  ["RC-2026-0014", "ณัฐวุฒิ ศรีสุข", "new", "medium", 21, 38200, "พระราม 2", null],
  ["RC-2026-0013", "อรทัย นาคดี", "field_visit", "high", 51, 99500, "นนทบุรี", "agent-04"],
  ["RC-2026-0012", "ไพศาล บุญช่วย", "contacting", "low", 17, 26800, "ปทุมธานี", "agent-03"],
  ["RC-2026-0011", "มาลี แสงจันทร์", "resolved", "low", 9, 15400, "ดินแดง", "agent-01"],
];
const agentName = (id: string | null) => agents.find((a) => a.id === id)?.name ?? "ยังไม่มอบหมาย";
const summaries: CaseSummary[] = seeds.map(
  (
    [id, customerName, stage, priority, daysPastDue, outstanding, branch, assignedAgentId],
    index,
  ) => ({
    source: "mock",
    id,
    customerName,
    phoneMasked: `08X-XXX-${String(4910 - index * 137).padStart(4, "0")}`,
    stage,
    priority,
    assignedAgentId,
    assignedAgentName: agentName(assignedAgentId),
    daysPastDue,
    outstanding,
    nextAction:
      stage === "field_visit"
        ? "ลงพื้นที่วันนี้ 14:30"
        : stage === "approval"
          ? "พิจารณาคำขอปรับแผน"
          : stage === "promise_to_pay"
            ? "ติดตามนัดชำระ 30 ก.ค."
            : "โทรติดตามภายในวันนี้",
    branch,
    updatedAt: `${10 + index}:2${index} น.`,
  }),
);
const timelineBase: readonly TimelineEvent[] = [
  {
    id: "tl-1",
    type: "approval",
    title: "ส่งคำขออนุมัติปรับแผน",
    description: "ขอแบ่งชำระ 2 งวด พร้อมเอกสารรายได้จำลอง",
    actor: "วราภรณ์ มีสุข",
    occurredAt: "วันนี้ 10:24",
    tone: "warning",
  },
  {
    id: "tl-2",
    type: "visit",
    title: "ลงพื้นที่สำเร็จ",
    description: "ยืนยันที่อยู่และตรวจสภาพทรัพย์สิน",
    actor: "ชลธิชา วงศ์ดี",
    occurredAt: "เมื่อวาน 15:42",
    tone: "success",
  },
  {
    id: "tl-3",
    type: "contact",
    title: "ติดต่อทางโทรศัพท์",
    description: "ลูกค้ารับสายและขอนัดหมายใหม่",
    actor: "ระบบ Mock",
    occurredAt: "20 ก.ค. 11:08",
    tone: "info",
  },
  {
    id: "tl-4",
    type: "status",
    title: "เปิดเคส Recovery",
    description: "เข้าเกณฑ์ค้างชำระและสร้างงานอัตโนมัติ",
    actor: "Mock Workflow",
    occurredAt: "18 ก.ค. 09:00",
    tone: "neutral",
  },
];
function makeDetail(item: CaseSummary, index: number): CaseDetail {
  return {
    ...item,
    nationalIdMasked: "1-10XX-XXXXX-42-1",
    emailMasked: "k***@example.local",
    address: `${99 + index}/12 ถนนตัวอย่าง แขวง${item.branch} กรุงเทพมหานคร`,
    contractNumber: `PS-CN-2607-${String(118 - index).padStart(4, "0")}`,
    originalPrincipal: item.outstanding + 74000,
    paidAmount: 74000,
    asset: {
      category: "รถจักรยานยนต์",
      brand: index % 2 ? "Honda" : "Yamaha",
      model: index % 2 ? "PCX 160" : "NMAX Connected",
      registration: `กข ${4210 + index} กรุงเทพฯ`,
      serialMasked: "MH3SG***92X8",
      estimatedValue: 92000 - index * 2400,
      condition: "ใช้งานปกติ มีรอยเล็กน้อย",
      status: "อยู่กับลูกค้า",
    },
    timeline: structuredClone(timelineBase),
    contacts: [
      {
        id: `ct-${index}-1`,
        channel: "phone",
        outcome: "connected",
        note: "นัดหมายติดตามอีกครั้ง",
        occurredAt: "20 ก.ค. 11:08",
        actor: item.assignedAgentName,
      },
    ],
    promiseToPay:
      item.stage === "promise_to_pay"
        ? {
            id: `ptp-${index}`,
            amount: 12000,
            dueDate: "2026-07-30",
            note: "ชำระงวดแรกผ่านช่องทางเดิม",
            status: "active",
          }
        : null,
    fieldVisits: [
      {
        id: `fv-${index}`,
        outcome: "met_customer",
        note: "พบลูกค้าและตรวจสอบทรัพย์สินแล้ว",
        occurredAt: "21 ก.ค. 15:42",
        latitude: 13.7563 + index * 0.004,
        longitude: 100.5018 + index * 0.003,
        accuracyMeters: 8,
        officer: item.assignedAgentName,
      },
    ],
    documents: [
      {
        id: `doc-${index}-1`,
        name: "สัญญาเช่าซื้อ (Mock).pdf",
        type: "PDF",
        pages: 6,
        size: "1.8 MB",
        uploadedAt: "18 ก.ค. 09:02",
      },
      {
        id: `doc-${index}-2`,
        name: "ภาพถ่ายทรัพย์สิน.jpg",
        type: "JPG",
        pages: 1,
        size: "842 KB",
        uploadedAt: "21 ก.ค. 15:44",
      },
    ],
    approval: {
      status: item.stage === "approval" ? "pending" : "approved",
      type: "ปรับแผนชำระ",
      requestedBy: item.assignedAgentName,
      requestedAt: "วันนี้ 10:24",
      note: "ขอแบ่งชำระ 2 งวด",
    },
  };
}
const nowLabel = () =>
  new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" }).format(new Date());
export class MockRecoveryRepository implements RecoveryRepository {
  private readonly latencyMs: number;
  private cases: CaseSummary[];
  private details: Record<string, CaseDetail>;
  constructor(options: { latencyMs?: number } = {}) {
    this.latencyMs = options.latencyMs ?? 450;
    this.cases = structuredClone(summaries);
    this.details = Object.fromEntries(
      this.cases.map((item, index) => [item.id, makeDetail(item, index)]),
    );
  }
  private async wait() {
    if (this.latencyMs > 0) await new Promise((r) => setTimeout(r, this.latencyMs));
  }
  private required(caseId: string) {
    const detail = this.details[caseId];
    if (!detail) throw new Error(`Unknown mock case: ${caseId}`);
    return detail;
  }
  private save(detail: CaseDetail) {
    this.details[detail.id] = detail;
    const summary: CaseSummary = {
      source: detail.source,
      id: detail.id,
      customerName: detail.customerName,
      phoneMasked: detail.phoneMasked,
      stage: detail.stage,
      priority: detail.priority,
      assignedAgentId: detail.assignedAgentId,
      assignedAgentName: detail.assignedAgentName,
      daysPastDue: detail.daysPastDue,
      outstanding: detail.outstanding,
      nextAction: detail.nextAction,
      branch: detail.branch,
      updatedAt: detail.updatedAt,
    };
    this.cases = this.cases.map((item) => (item.id === detail.id ? summary : item));
    return structuredClone(detail);
  }
  async listCases() {
    await this.wait();
    return structuredClone(this.cases);
  }
  async getCase(caseId: string) {
    await this.wait();
    return this.details[caseId] ? structuredClone(this.details[caseId]) : null;
  }
  async listAgents() {
    await this.wait();
    return structuredClone(agents);
  }
  async assignCase(caseId: string, agentId: string) {
    await this.wait();
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) throw new Error("Unknown mock agent");
    const current = this.required(caseId);
    return this.save({
      ...current,
      assignedAgentId: agent.id,
      assignedAgentName: agent.name,
      updatedAt: nowLabel(),
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "status",
          title: "มอบหมายผู้รับผิดชอบ",
          description: `มอบหมายให้ ${agent.name}`,
          actor: "BB Admin",
          occurredAt: "เมื่อสักครู่",
          tone: "info",
        },
        ...current.timeline,
      ],
    });
  }
  async addContactAttempt(caseId: string, input: AddContactInput) {
    await this.wait();
    const current = this.required(caseId);
    const contact = {
      id: crypto.randomUUID(),
      ...input,
      occurredAt: "เมื่อสักครู่",
      actor: "BB Admin",
    } as const;
    return this.save({
      ...current,
      stage: "contacting",
      contacts: [contact, ...current.contacts],
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "contact",
          title: "บันทึกการติดต่อ",
          description: input.note,
          actor: "BB Admin",
          occurredAt: "เมื่อสักครู่",
          tone: input.outcome === "connected" ? "success" : "warning",
        },
        ...current.timeline,
      ],
    });
  }
  async createPromiseToPay(caseId: string, input: PromiseInput) {
    await this.wait();
    const current = this.required(caseId);
    return this.save({
      ...current,
      stage: "promise_to_pay",
      promiseToPay: { id: crypto.randomUUID(), ...input, status: "active" },
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "promise",
          title: "สร้าง Promise to Pay",
          description: `นัดชำระ ${input.amount.toLocaleString("th-TH")} บาท ภายใน ${input.dueDate}`,
          actor: "BB Admin",
          occurredAt: "เมื่อสักครู่",
          tone: "success",
        },
        ...current.timeline,
      ],
    });
  }
  async recordFieldVisit(caseId: string, input: FieldVisitInput) {
    await this.wait();
    const current = this.required(caseId);
    const visit = {
      id: crypto.randomUUID(),
      ...input,
      occurredAt: "เมื่อสักครู่",
      latitude: 13.7563,
      longitude: 100.5018,
      accuracyMeters: 7,
      officer: "BB Field",
    } as const;
    return this.save({
      ...current,
      stage: "field_visit",
      fieldVisits: [visit, ...current.fieldVisits],
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "visit",
          title: "บันทึก Field Visit",
          description: input.note,
          actor: "BB Field",
          occurredAt: "เมื่อสักครู่",
          tone: "success",
        },
        ...current.timeline,
      ],
    });
  }
  async resolveApproval(caseId: string, input: ApprovalInput) {
    await this.wait();
    const current = this.required(caseId);
    return this.save({
      ...current,
      approval: { ...current.approval, status: input.decision, note: input.note },
      stage: input.decision === "approved" ? "promise_to_pay" : "contacting",
      timeline: [
        {
          id: crypto.randomUUID(),
          type: "approval",
          title: input.decision === "approved" ? "อนุมัติคำขอ" : "ไม่อนุมัติคำขอ",
          description: input.note,
          actor: "BB Approver",
          occurredAt: "เมื่อสักครู่",
          tone: input.decision === "approved" ? "success" : "danger",
        },
        ...current.timeline,
      ],
    });
  }
}

export const recoveryRepository = new MockRecoveryRepository();
