import { describe, expect, it, vi } from "vitest";
import { RecoveryApiError } from "../../application/recovery-api-error";
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

  it.each([
    [401, "unauthorized"],
    [403, "forbidden"],
    [503, "dependency_failure"],
  ] as const)("preserves a standardized %s API error envelope", async (status, kind) => {
    const fetcher = vi.fn(async () =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            error: { code: "recovery_unavailable", message: "Recovery data unavailable" },
            meta: { correlationId: "corr-safe-123" },
          }),
          { status, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const repository = new StagingRecoveryRepository({ fetcher });

    const error = await repository.listCases().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(RecoveryApiError);
    expect(error).toMatchObject({
      kind,
      status,
      code: "recovery_unavailable",
      message: "Recovery data unavailable",
      correlationId: "corr-safe-123",
    });
  });

  it("uses a safe fallback when an upstream error is not a standardized JSON envelope", async () => {
    const repository = new StagingRecoveryRepository({
      fetcher: vi.fn(async () => new Response("private upstream detail", { status: 502 })),
    });

    const error = await repository.listCases().catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "dependency_failure",
      status: 502,
      code: "unknown_error",
      message: "Recovery service request failed",
      correlationId: null,
    });
    expect(String(error)).not.toContain("private upstream detail");
  });

  it("terminates a hanging request with a bounded timeout", async () => {
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        }),
    );
    const repository = new StagingRecoveryRepository({ fetcher, timeoutMs: 5 });

    const error = await repository.listCases().catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      kind: "timeout",
      code: "request_timeout",
      status: null,
      correlationId: null,
    });
  });
});
