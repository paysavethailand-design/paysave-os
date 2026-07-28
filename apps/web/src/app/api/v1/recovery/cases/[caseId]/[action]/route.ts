import { ApiError } from "@/shared/lib/api-error";
import { requireApiPermission } from "@/features/auth/server";
import {
  RECOVERY_PERMISSIONS,
  executeLifecycleUseCase,
  executeOperationMvpUseCase,
  type AtomicGapAction,
  type OperationMvpAction,
} from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly caseId: string;
  readonly action: string;
}
const actions: Readonly<Record<string, AtomicGapAction>> = {
  close: "case.close",
  reopen: "case.reopen",
};
const operationActions: Readonly<Record<string, OperationMvpAction>> = {
  "submit-review": "case.submit_review",
  approve: "case.approve",
  reject: "case.reject",
};
export const POST = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  const operationAction = operationActions[p.action];
  if (operationAction) {
    return apiOk(
      await executeOperationMvpUseCase(operationAction, p.caseId, await readJsonBody(r), {
        actor,
        correlationId: c,
      }),
      c,
    );
  }
  const action = actions[p.action];
  if (!action) throw new ApiError("not_found", `Unknown case action: ${p.action}`);
  return apiOk(
    await executeLifecycleUseCase(action, p.caseId, await readJsonBody(r), {
      actor,
      correlationId: c,
    }),
    c,
  );
});
