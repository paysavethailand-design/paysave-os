import { RecordingAuditSink } from "@paysave/observability";
import type { AuthContext } from "@paysave/security";
import { describe, expect, it, vi } from "vitest";
import type { RecoveryCoreRepository } from "./ports/recovery-core-repository";
import {
  appendTimeline,
  createCase,
  decodeTimelineCursor,
  encodeTimelineCursor,
  getCase,
  listCases,
  rejectAtomicLifecycleCommand,
  updateCase,
  validateWorkflowTransition,
} from "./recovery-service";

const partnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: partnerId,
  roles: ["agent"],
  permissions: ["cases.read", "cases.manage", "assignments.read", "assignments.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};
const caseRow = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partnerId,
  branchId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  customerId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
  contractId: null,
  statusId: "3b3c4d5e-6f78-4901-90ab-cdef01234569",
  priority: "high",
  openedAt: "2026-07-22T00:00:00.000Z",
  nextActionAt: "2026-07-23T00:00:00.000Z",
  closedAt: null,
  versionNo: 1,
  businessObjectId: "4b3c4d5e-6f78-4901-90ab-cdef01234560",
  createdAt: "2026-07-22T00:00:00.000Z",
  updatedAt: "2026-07-22T00:00:00.000Z",
};
function repository(overrides: Partial<RecoveryCoreRepository> = {}): RecoveryCoreRepository {
  return {
    listCases: async () => [],
    findCaseById: async () => caseRow,
    createCase: async (input) => ({ ...caseRow, ...input, contractId: input.contractId ?? null }),
    updateCase: async () => ({ outcome: "updated", value: { ...caseRow, versionNo: 2 } }),
    listTimeline: async () => [],
    appendTimelineEvent: async () => {
      throw new Error("unused");
    },
    createAssignment: async () => {
      throw new Error("unused");
    },
    createFieldVisit: async () => {
      throw new Error("unused");
    },
    updateFieldVisitCheckpoint: async () => ({ outcome: "not_found" }),
    appendVisitResult: async () => {
      throw new Error("unused");
    },
    createContactAttempt: async () => {
      throw new Error("unused");
    },
    createPromiseToPay: async () => {
      throw new Error("unused");
    },
    updatePromiseToPay: async () => ({ outcome: "not_found" }),
    listWorkflowTransitions: async () => [],
    ...overrides,
  };
}
const context = { actor, correlationId: "corr-123" };
describe("Recovery Core application service", () => {
  it("creates one recovery.cases row in the active tenant and records correlation-aware audit", async () => {
    const auditSink = new RecordingAuditSink();
    const create = vi.fn(async (input) => ({
      ...caseRow,
      ...input,
      contractId: input.contractId ?? null,
    }));
    const created = await createCase(
      {
        branchId: caseRow.branchId,
        customerId: caseRow.customerId,
        statusId: caseRow.statusId,
        priority: "high",
        openedAt: caseRow.openedAt,
        nextActionAt: caseRow.nextActionAt,
        businessObjectId: caseRow.businessObjectId,
      },
      context,
      { repository: repository({ createCase: create }), auditSink },
    );
    expect(created.partnerId).toBe(partnerId);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId, createdBy: actor.userId }),
    );
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        correlationId: "corr-123",
        action: "recovery.case.create",
        outcome: "success",
      }),
    ]);
  });
  it("maps an optimistic-lock miss to HTTP 409 conflict", async () => {
    await expect(
      updateCase(caseRow.id, { expectedVersionNo: 1, priority: "critical" }, context, {
        repository: repository({ updateCase: async () => ({ outcome: "version_conflict" }) }),
        auditSink: new RecordingAuditSink(),
      }),
    ).rejects.toMatchObject({ code: "conflict", status: 409 });
  });
  it("fails closed with exact CTO 501 code/reason and never invokes a repository write", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      rejectAtomicLifecycleCommand("case.close", caseRow.id, context, auditSink),
    ).rejects.toMatchObject({
      code: "atomic_transaction_not_supported",
      status: 501,
      message:
        "Atomic multi-aggregate transaction is not yet supported by the current approved architecture.",
    });
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "recovery.case.close",
        outcome: "denied",
        reason: "atomic_transaction_waiver_required",
      }),
    ]);
  });
  it("validates the workflow status engine without mutating state", () => {
    const transitions = [
      {
        id: "5b3c4d5e-6f78-4901-90ab-cdef01234561",
        fromStateId: caseRow.statusId,
        toStateId: "6b3c4d5e-6f78-4901-90ab-cdef01234562",
        actionCode: "accept",
        permissionCode: "cases.manage",
      },
    ];
    expect(
      validateWorkflowTransition(transitions, caseRow.statusId, "accept", actor.permissions),
    ).toEqual(transitions[0]);
    expect(() =>
      validateWorkflowTransition(transitions, caseRow.statusId, "close", actor.permissions),
    ).toThrowError(/not allowed/i);
  });
  it("rejects a case detail from another tenant at the application boundary", async () => {
    const other = { ...caseRow, partnerId: "7f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d42" };
    await expect(
      getCase(caseRow.id, context, {
        repository: repository({ findCaseById: async () => other }),
        auditSink: new RecordingAuditSink(),
      }),
    ).rejects.toMatchObject({ code: "forbidden", status: 403 });
  });
  it("audits read operations with the request correlation id", async () => {
    const auditSink = new RecordingAuditSink();
    await listCases({}, context, { repository: repository(), auditSink });
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "recovery.case.search",
        correlationId: "corr-123",
        outcome: "success",
      }),
    ]);
  });
  it("requires a UUID correlation id before appending a timeline row", async () => {
    const append = vi.fn();
    await expect(
      appendTimeline(
        caseRow.id,
        {
          eventType: "contact",
          occurredAt: "2026-07-22T12:00:00.000Z",
          sourceType: "contact_attempt",
          sourceId: "7b3c4d5e-6f78-4901-90ab-cdef01234563",
          summary: "called",
          payloadJson: {},
          eventVersionId: "8b3c4d5e-6f78-4901-90ab-cdef01234564",
          causationId: "9b3c4d5e-6f78-4901-90ab-cdef01234565",
          visibilityCode: "tenant",
        },
        context,
        {
          repository: repository({ appendTimelineEvent: append }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toBeDefined();
    expect(append).not.toHaveBeenCalled();
  });
  it("round-trips a compound timeline cursor", () => {
    const cursor = {
      occurredAt: "2026-07-22T12:00:00.000Z",
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
    };
    expect(decodeTimelineCursor(encodeTimelineCursor(cursor))).toEqual(cursor);
  });
});
