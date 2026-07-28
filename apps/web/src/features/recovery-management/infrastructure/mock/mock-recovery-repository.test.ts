import { beforeEach, describe, expect, it } from "vitest";
import { MockRecoveryRepository } from "./mock-recovery-repository";

describe("MockRecoveryRepository", () => {
  let repository: MockRecoveryRepository;

  beforeEach(() => {
    repository = new MockRecoveryRepository({ latencyMs: 0 });
  });

  it("returns isolated case summaries and a complete detail aggregate", async () => {
    const cases = await repository.listCases();
    const detail = await repository.getCase("RC-2026-0018");

    expect(cases).toHaveLength(8);
    expect(cases.every((item) => item.source === "mock")).toBe(true);
    expect(detail?.timeline.length).toBeGreaterThan(2);
    expect(detail?.documents.length).toBeGreaterThan(0);
    expect(detail?.asset.registration).toBeTruthy();
  });

  it("updates assignment without mutating a different repository instance", async () => {
    await repository.assignCase("RC-2026-0018", "agent-03");

    expect((await repository.getCase("RC-2026-0018"))?.assignedAgentId).toBe("agent-03");
    expect(
      (await new MockRecoveryRepository({ latencyMs: 0 }).getCase("RC-2026-0018"))?.assignedAgentId,
    ).not.toBe("agent-03");
  });

  it("records contact, promise-to-pay, field visit, and approval events", async () => {
    await repository.addContactAttempt("RC-2026-0018", {
      channel: "phone",
      outcome: "connected",
      note: "ลูกค้ายืนยันนัดชำระ",
    });
    await repository.createPromiseToPay("RC-2026-0018", {
      amount: 8500,
      dueDate: "2026-07-30",
      note: "งวดแรก",
    });
    await repository.recordFieldVisit("RC-2026-0018", {
      outcome: "met_customer",
      note: "พบลูกค้าแล้ว",
    });
    await repository.resolveApproval("RC-2026-0018", {
      decision: "approved",
      note: "อนุมัติตามหลักฐานจำลอง",
    });

    const detail = await repository.getCase("RC-2026-0018");
    expect(detail?.contacts.at(0)?.outcome).toBe("connected");
    expect(detail?.promiseToPay?.amount).toBe(8500);
    expect(detail?.fieldVisits.at(0)?.outcome).toBe("met_customer");
    expect(detail?.approval.status).toBe("approved");
    expect(detail?.timeline.some((item) => item.type === "approval")).toBe(true);
  });
});
