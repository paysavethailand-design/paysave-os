import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { actor, executeOperation } = vi.hoisted(() => ({
  actor: {
    userId: "00000000-0000-7000-8000-000000000011",
    activePartnerId: "00000000-0000-7000-8000-000000000001",
    roles: ["admin"],
    permissions: ["cases.manage", "assignments.manage"],
    tenantScope: "active",
    sessionVersion: 1,
  },
  executeOperation: vi.fn(async (action: string, caseId: string) => ({
    action,
    caseId,
    transactionStatus: "committed" as const,
  })),
}));
vi.mock("@/features/auth/server", () => ({ requireApiPermission: vi.fn(async () => actor) }));
vi.mock("@/features/recovery-core/server", () => ({
  RECOVERY_PERMISSIONS: { CASES_MANAGE: "cases.manage", ASSIGNMENTS_MANAGE: "assignments.manage" },
  executeLifecycleUseCase: vi.fn(),
  executeOperationMvpUseCase: executeOperation,
}));

import { POST } from "./cases/[caseId]/[action]/route";

const caseId = "00000000-0000-7000-8000-000000000072";
function request(body: unknown) {
  return new NextRequest("http://localhost/api/v1/recovery/cases/test/action", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-correlation-id": "00000000-0000-7000-8000-000000000118",
    },
    body: JSON.stringify(body),
  });
}

describe("Operation MVP case action routes", () => {
  it.each([
    ["submit-review", "case.submit_review"],
    ["approve", "case.approve"],
    ["reject", "case.reject"],
  ] as const)(
    "commits %s through the operation transaction boundary",
    async (urlAction, action) => {
      const body = { expectedVersionNo: 4, targetStatusId: "00000000-0000-7000-8000-000000000073" };
      const response = await POST(request(body), {
        params: Promise.resolve({ caseId, action: urlAction }),
      });

      expect(response.status).toBe(200);
      expect((await response.json()).data).toMatchObject({
        action,
        caseId,
        transactionStatus: "committed",
      });
      expect(executeOperation).toHaveBeenLastCalledWith(
        action,
        caseId,
        body,
        expect.objectContaining({ correlationId: "00000000-0000-7000-8000-000000000118" }),
      );
    },
  );
});
