import { describe, expect, it, vi } from "vitest";
import { StagingRecoveryRepository } from "./staging-recovery-repository";

const caseRow = {
  id: "11111111-1111-4111-8111-111111111111",
  partnerId: "22222222-2222-4222-8222-222222222222",
  branchId: "33333333-3333-4333-8333-333333333333",
  customerId: "44444444-4444-4444-8444-444444444444",
  contractId: null,
  statusId: "55555555-5555-4555-8555-555555555555",
  priority: "high",
  openedAt: "2026-07-20T00:00:00.000Z",
  nextActionAt: "2026-07-25T00:00:00.000Z",
  closedAt: null,
  versionNo: 1,
  businessObjectId: "66666666-6666-4666-8666-666666666666",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-21T00:00:00.000Z",
};

describe("StagingRecoveryRepository", () => {
  it("loads real recovery cases from the authenticated API instead of mock data", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(JSON.stringify({ data: [caseRow], meta: { correlationId: "corr-1" } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
    );
    const repository = new StagingRecoveryRepository({ fetcher });

    const cases = await repository.listCases();

    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/recovery/cases?limit=100",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(cases).toHaveLength(1);
    expect(cases[0]).toMatchObject({
      source: "staging",
      id: caseRow.id,
      priority: "high",
      branch: caseRow.branchId,
    });
  });

  it("loads case detail and timeline through staging APIs", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/timeline?limit=100")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "77777777-7777-4777-8777-777777777777",
                eventType: "contact",
                occurredAt: "2026-07-21T01:00:00.000Z",
                actorUserId: null,
                summary: "โทรติดตาม",
              },
            ],
            meta: { correlationId: "corr-2", nextCursor: null },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ data: caseRow, meta: { correlationId: "corr-1" } }), {
        status: 200,
      });
    });
    const repository = new StagingRecoveryRepository({ fetcher });

    const detail = await repository.getCase(caseRow.id);

    expect(detail?.source).toBe("staging");
    expect(detail?.timeline[0]).toMatchObject({ title: "โทรติดตาม", type: "contact" });
    expect(detail?.documents).toEqual([]);
  });

  it("fails closed on unsupported UI commands rather than mutating local mock state", async () => {
    const repository = new StagingRecoveryRepository({ fetcher: vi.fn() });

    await expect(
      repository.resolveApproval(caseRow.id, { decision: "approved", note: "ok" }),
    ).rejects.toThrow("staging_runtime_command_not_supported:approval");
  });
});
