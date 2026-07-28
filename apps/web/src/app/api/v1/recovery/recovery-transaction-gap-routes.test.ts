import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { actor, executeLifecycle } = vi.hoisted(() => ({
  actor: {
    userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
    activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
    roles: ["agent"],
    permissions: ["cases.manage", "assignments.manage"],
    tenantScope: "active",
    sessionVersion: 1,
  },
  executeLifecycle: vi.fn(async (action: string, resourceId: string) => ({
    action,
    resourceId,
    transactionStatus: "committed" as const,
  })),
}));

vi.mock("@/features/auth/server", () => ({ requireApiPermission: vi.fn(async () => actor) }));
vi.mock("@/features/recovery-core/server", () => ({
  RECOVERY_PERMISSIONS: {
    CASES_MANAGE: "cases.manage",
    ASSIGNMENTS_MANAGE: "assignments.manage",
  },
  executeLifecycleUseCase: executeLifecycle,
}));

import { POST as caseAction } from "./cases/[caseId]/[action]/route";
import { POST as assignmentAction } from "./assignments/[assignmentId]/[action]/route";
import { POST as promiseAction } from "./promises-to-pay/[promiseId]/[action]/route";
import { POST as workflowTransition } from "./workflow/transitions/route";

const id = "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444";
const targetId = "8f7a1e2b-3333-4d3d-9a1a-1111aaaa5555";

/** Creates an authenticated JSON request carrying the endpoint-specific command body. */
function request(body: unknown) {
  return new NextRequest("http://localhost/api/v1/recovery/test", {
    method: "POST",
    headers: {
      "x-correlation-id": "97455214-b91e-4f5e-9e5b-7d68ddbd8c44",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

const caseInput = { expectedVersionNo: 1, targetStatusId: targetId, reasonCode: "beta-test" };
const assignmentInput = {
  expectedVersionNo: 1,
  targetStatusId: targetId,
  reasonCode: "beta-test",
};
const promiseInput = { expectedVersionNo: 1, reasonCode: "beta-test" };

describe("Recovery workflow runtime API routes", () => {
  const dynamic = [
    [caseAction, "caseId", "close", "case.close", caseInput],
    [caseAction, "caseId", "reopen", "case.reopen", caseInput],
    [
      assignmentAction,
      "assignmentId",
      "reassign",
      "assignment.reassign",
      { ...assignmentInput, targetAgentId: targetId },
    ],
    [assignmentAction, "assignmentId", "accept", "assignment.accept", assignmentInput],
    [assignmentAction, "assignmentId", "reject", "assignment.reject", assignmentInput],
    [assignmentAction, "assignmentId", "complete", "assignment.complete", assignmentInput],
    [promiseAction, "promiseId", "fulfill", "promise.fulfill", promiseInput],
    [promiseAction, "promiseId", "broken", "promise.broken", promiseInput],
    [promiseAction, "promiseId", "cancel", "promise.cancel", promiseInput],
  ] as const;

  it.each(dynamic)(
    "commits lifecycle command for %s %s %s",
    async (route, key, urlAction, domainAction, input) => {
      const response = await route(request(input), {
        params: Promise.resolve({ [key]: id, action: urlAction } as never),
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        data: { action: domainAction, resourceId: id, transactionStatus: "committed" },
        meta: { correlationId: "97455214-b91e-4f5e-9e5b-7d68ddbd8c44" },
      });
      expect(executeLifecycle).toHaveBeenLastCalledWith(
        domainAction,
        id,
        input,
        expect.objectContaining({ correlationId: "97455214-b91e-4f5e-9e5b-7d68ddbd8c44" }),
      );
    },
  );

  it("commits a validated workflow transition", async () => {
    const input = {
      instanceId: id,
      expectedVersionNo: 1,
      currentStateId: targetId,
      actionCode: "case.close",
    };
    const response = await workflowTransition(request(input));

    expect(response.status).toBe(200);
    expect((await response.json()).data.transactionStatus).toBe("committed");
    expect(executeLifecycle).toHaveBeenLastCalledWith(
      "workflow.transition",
      id,
      input,
      expect.any(Object),
    );
  });
});
