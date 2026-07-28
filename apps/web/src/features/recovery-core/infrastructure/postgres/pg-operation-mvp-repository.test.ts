import { describe, expect, it } from "vitest";
import type { AuthContext } from "@paysave/security";
import { PgOperationMvpRepository } from "./pg-operation-mvp-repository";

const partnerId = "00000000-0000-7000-8000-000000000001";
const caseId = "00000000-0000-7000-8000-000000000072";
const assignmentId = "00000000-0000-7000-8000-000000000082";
const visitId = "00000000-0000-7000-8000-000000000094";
const statusId = "00000000-0000-7000-8000-000000000071";
const targetStatusId = "00000000-0000-7000-8000-000000000073";
const policyVersionId = "00000000-0000-7000-8000-000000000102";
const policyStepId = "00000000-0000-7000-8000-000000000103";
const approvalRequestId = "00000000-0000-7000-8000-000000000104";
const approvalStepId = "00000000-0000-7000-8000-000000000105";
const membershipId = "00000000-0000-7000-8000-000000000021";
const actor: AuthContext = {
  userId: "00000000-0000-7000-8000-000000000011",
  activePartnerId: partnerId,
  roles: ["admin"],
  permissions: ["cases.manage", "assignments.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};
const context = { actor, correlationId: "00000000-0000-7000-8000-000000000118" };

type Response = { rows: Record<string, unknown>[]; rowCount?: number };
class FakeClient {
  readonly statements: string[] = [];
  private index = 0;
  constructor(
    private readonly responses: readonly Response[],
    private readonly failOn = -1,
  ) {}
  async query(text: string): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    const normalized = text.trim().replaceAll(/\s+/g, " ");
    this.statements.push(normalized);
    if (this.statements.length === this.failOn) throw new Error("forced operation failure");
    if (
      /^(BEGIN|COMMIT|ROLLBACK)$/.test(text.trim()) ||
      text.includes("set_config") ||
      text.includes("SET LOCAL ROLE") ||
      text.includes("INSERT INTO audit.workflow_events")
    ) {
      return { rows: [], rowCount: 0 };
    }
    const response = this.responses[this.index++] ?? { rows: [], rowCount: 0 };
    return { rows: response.rows, rowCount: response.rowCount ?? response.rows.length };
  }
  release() {}
}
class FakePool {
  constructor(readonly client: FakeClient) {}
  async connect() {
    return this.client;
  }
}
function repository(responses: readonly Response[], failOn = -1) {
  const client = new FakeClient(responses, failOn);
  return { client, repository: new PgOperationMvpRepository(new FakePool(client) as never) };
}
function lockedCase(versionNo: number) {
  return {
    id: caseId,
    partner_id: partnerId,
    status_id: statusId,
    version_no: versionNo,
    business_object_id: "00000000-0000-7000-8000-000000000063",
  };
}

describe("PgOperationMvpRepository", () => {
  it("submits a case for review with pending approval, status history, timeline and audit in one transaction", async () => {
    const { client, repository: repo } = repository([
      { rows: [lockedCase(4)] },
      { rows: [{ id: targetStatusId, is_terminal: false }] },
      { rows: [{ id: caseId }] },
      { rows: [], rowCount: 1 },
      { rows: [{ id: approvalRequestId }] },
      { rows: [{ id: approvalStepId }] },
      { rows: [], rowCount: 1 },
    ]);

    const result = await repo.submitReview(
      caseId,
      {
        expectedVersionNo: 4,
        targetStatusId,
        reasonCode: "field-submitted",
        policyVersionId,
        policyStepId,
        dueAt: "2026-07-25T12:00:00.000Z",
      },
      context,
    );

    expect(result).toMatchObject({
      caseId,
      status: "pending",
      approvalRequestId,
      transactionStatus: "committed",
    });
    expect(client.statements[0]).toBe("BEGIN");
    expect(client.statements[1]).toBe("SET LOCAL ROLE paysave_runtime");
    expect(client.statements.at(-1)).toBe("COMMIT");
    expect(client.statements.some((sql) => sql.includes("INSERT INTO approval.requests"))).toBe(
      true,
    );
    expect(
      client.statements.some((sql) => sql.includes("INSERT INTO approval.request_steps")),
    ).toBe(true);
    expect(client.statements.some((sql) => sql.includes("recovery.case_status_history"))).toBe(
      true,
    );
    expect(client.statements.some((sql) => sql.includes("recovery.case_timeline_events"))).toBe(
      true,
    );
    expect(client.statements.some((sql) => sql.includes("INSERT INTO audit.workflow_events"))).toBe(
      true,
    );
  });

  it.each(["approved", "rejected"] as const)(
    "records immutable %s decision and updates the case atomically",
    async (decision) => {
      const { client, repository: repo } = repository([
        { rows: [lockedCase(5)] },
        { rows: [{ id: approvalRequestId, status: "pending", version_no: 1 }] },
        { rows: [{ id: approvalStepId, status: "pending" }] },
        { rows: [{ id: targetStatusId, is_terminal: false }] },
        { rows: [{ id: approvalRequestId }] },
        { rows: [{ id: approvalStepId }] },
        { rows: [], rowCount: 1 },
        { rows: [{ id: caseId }] },
        { rows: [], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ]);

      const result = await repo.decideReview(
        caseId,
        {
          expectedVersionNo: 5,
          targetStatusId,
          approvalRequestId,
          approvalStepId,
          actorMembershipId: membershipId,
          decision,
          reasonCode: "admin-reviewed",
          evidence: "case-review-v1",
        },
        context,
      );

      expect(result).toMatchObject({ caseId, status: decision, transactionStatus: "committed" });
      expect(client.statements.some((sql) => sql.includes("INSERT INTO approval.decisions"))).toBe(
        true,
      );
      expect(client.statements.some((sql) => sql.includes("UPDATE approval.requests"))).toBe(true);
      expect(client.statements.at(-1)).toBe("COMMIT");
    },
  );

  it("closes only an approved case and creates a zero-value pending commission stub in the same transaction", async () => {
    const { client, repository: repo } = repository([
      { rows: [lockedCase(6)] },
      { rows: [{ id: targetStatusId, is_terminal: true }] },
      { rows: [{ id: approvalRequestId, status: "approved" }] },
      { rows: [{ agent_id: "00000000-0000-7000-8000-000000000081" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000122" }] },
      { rows: [{ id: caseId }] },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
      { rows: [{ id: "00000000-0000-7000-8000-000000000160" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000161" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000162", status: "pending" }] },
      { rows: [], rowCount: 1 },
    ]);

    const result = await repo.closeCase(
      caseId,
      {
        expectedVersionNo: 6,
        targetStatusId,
        approvalRequestId,
        reasonCode: "approved-close",
        currencyCode: "THB",
      },
      context,
    );

    expect(result).toMatchObject({
      caseId,
      locked: true,
      commissionStatus: "pending",
      transactionStatus: "committed",
    });
    expect(
      client.statements.some((sql) => sql.includes("INSERT INTO performance.commission_runs")),
    ).toBe(true);
    expect(
      client.statements.some((sql) => sql.includes("INSERT INTO performance.commission_items")),
    ).toBe(true);
    expect(
      client.statements.some((sql) => sql.includes("commission_amount") && sql.includes("VALUES")),
    ).toBe(true);
    expect(client.statements.at(-1)).toBe("COMMIT");
  });

  it("rolls back close when commission creation fails", async () => {
    const { client, repository: repo } = repository(
      [
        { rows: [lockedCase(6)] },
        { rows: [{ id: targetStatusId, is_terminal: true }] },
        { rows: [{ id: approvalRequestId, status: "approved" }] },
        { rows: [{ agent_id: "00000000-0000-7000-8000-000000000081" }] },
        { rows: [{ id: "00000000-0000-7000-8000-000000000122" }] },
        { rows: [{ id: caseId }] },
        { rows: [], rowCount: 1 },
        { rows: [], rowCount: 1 },
      ],
      11,
    );

    await expect(
      repo.closeCase(
        caseId,
        {
          expectedVersionNo: 6,
          targetStatusId,
          approvalRequestId,
          reasonCode: "approved-close",
          currencyCode: "THB",
        },
        context,
      ),
    ).rejects.toThrow("forced operation failure");
    expect(client.statements.at(-1)).toBe("ROLLBACK");
    expect(client.statements).not.toContain("COMMIT");
  });

  it("records photo metadata for before/after/device/location with timeline and signed access metadata", async () => {
    const { client, repository: repo } = repository([
      { rows: [lockedCase(4)] },
      { rows: [{ id: assignmentId }] },
      { rows: [{ id: visitId }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000163" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000164" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000165" }] },
      { rows: [{ id: "00000000-0000-7000-8000-000000000166" }] },
      { rows: [], rowCount: 1 },
    ]);

    const result = await repo.recordPhoto(
      caseId,
      {
        assignmentId,
        visitId,
        purpose: "before",
        filename: "before.jpg",
        mediaType: "image/jpeg",
        sizeBytes: 4,
        checksumSha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        objectKey: `${partnerId}/${caseId}/before.jpg`,
        device: { platform: "ios", deviceRef: "field-device-01" },
        location: { latitude: 13.7563, longitude: 100.5018, accuracyMeters: 8 },
      },
      context,
    );

    expect(result).toMatchObject({ caseId, purpose: "before", transactionStatus: "committed" });
    expect(client.statements.some((sql) => sql.includes("document_store.attachments"))).toBe(true);
    expect(
      client.statements.some((sql) => sql.includes("document_store.attachment_versions")),
    ).toBe(true);
    expect(client.statements.some((sql) => sql.includes("document_store.case_attachments"))).toBe(
      true,
    );
    expect(client.statements.some((sql) => sql.includes("document_store.visit_attachments"))).toBe(
      true,
    );
    expect(client.statements.some((sql) => sql.includes("recovery.case_timeline_events"))).toBe(
      true,
    );
    expect(client.statements.at(-1)).toBe("COMMIT");
  });
});
