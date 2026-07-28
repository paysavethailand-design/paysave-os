import { describe, expect, it } from "vitest";
import type { AuthContext } from "@paysave/security";
import { PgWorkflowRuntimeRepository } from "./pg-workflow-runtime-repository";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["agent"],
  permissions: ["cases.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

class FakeClient {
  readonly statements: string[] = [];
  private responseIndex = 0;

  constructor(
    private readonly responses: ReadonlyArray<{
      rows: Record<string, unknown>[];
      rowCount?: number;
    }>,
    private readonly failAt = -1,
  ) {}

  /** Records SQL and returns deterministic rows for transaction orchestration tests. */
  async query(text: string): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
    this.statements.push(text.trim().replaceAll(/\s+/g, " "));
    if (this.statements.length === this.failAt) throw new Error("forced transaction failure");
    if (
      /^(BEGIN|COMMIT|ROLLBACK)$/.test(text.trim()) ||
      text.includes("set_config") ||
      text.includes("SET LOCAL ROLE") ||
      text.includes("INSERT INTO audit.workflow_events")
    ) {
      return { rows: [], rowCount: 0 };
    }
    const response = this.responses[this.responseIndex++] ?? { rows: [], rowCount: 0 };
    return { rows: response.rows, rowCount: response.rowCount ?? response.rows.length };
  }

  /** Matches node-postgres client lifecycle without external side effects. */
  release() {}
}

class FakePool {
  constructor(readonly client: FakeClient) {}

  /** Returns the deterministic client used by one repository transaction. */
  async connect() {
    return this.client;
  }
}

const context = { actor, correlationId: "97455214-b91e-4f5e-9e5b-7d68ddbd8c44" };

describe("PgWorkflowRuntimeRepository", () => {
  it("commits case mutation, status history, and timeline in one transaction", async () => {
    const client = new FakeClient([
      {
        rows: [
          {
            id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
            partner_id: actor.activePartnerId,
            status_id: "8f7a1e2b-1111-4d3d-9a1a-1111aaaa3333",
            version_no: 1,
          },
        ],
      },
      { rows: [{ id: "8f7a1e2b-3333-4d3d-9a1a-1111aaaa5555", is_terminal: true }] },
      { rows: [{ id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444" }] },
      { rows: [], rowCount: 1 },
      { rows: [], rowCount: 1 },
    ]);
    const repository = new PgWorkflowRuntimeRepository(new FakePool(client) as never);

    await expect(
      repository.execute(
        "case.close",
        "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
        {
          expectedVersionNo: 1,
          targetStatusId: "8f7a1e2b-3333-4d3d-9a1a-1111aaaa5555",
          reasonCode: "beta-test",
        },
        context,
      ),
    ).resolves.toMatchObject({ transactionStatus: "committed", writes: 3 });
    expect(client.statements[0]).toBe("BEGIN");
    expect(client.statements[1]).toBe("SET LOCAL ROLE paysave_runtime");
    expect(client.statements.at(-1)).toBe("COMMIT");
    expect(
      client.statements.some((statement) => statement.includes("recovery.case_status_history")),
    ).toBe(true);
    expect(
      client.statements.some((statement) => statement.includes("recovery.case_timeline_events")),
    ).toBe(true);
    expect(
      client.statements.some((statement) =>
        statement.includes("INSERT INTO audit.workflow_events"),
      ),
    ).toBe(true);
  });

  it("rolls back every write when a later statement fails", async () => {
    const client = new FakeClient(
      [
        {
          rows: [
            {
              id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
              partner_id: actor.activePartnerId,
              status_id: "8f7a1e2b-1111-4d3d-9a1a-1111aaaa3333",
              version_no: 1,
            },
          ],
        },
        { rows: [{ id: "8f7a1e2b-3333-4d3d-9a1a-1111aaaa5555", is_terminal: true }] },
        { rows: [{ id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444" }] },
      ],
      7,
    );
    const repository = new PgWorkflowRuntimeRepository(new FakePool(client) as never);

    await expect(
      repository.execute(
        "case.close",
        "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
        {
          expectedVersionNo: 1,
          targetStatusId: "8f7a1e2b-3333-4d3d-9a1a-1111aaaa5555",
          reasonCode: "beta-test",
        },
        context,
      ),
    ).rejects.toThrow("forced transaction failure");
    expect(client.statements.at(-1)).toBe("ROLLBACK");
    expect(client.statements).not.toContain("COMMIT");
  });
});
