import { requireApiPermission } from "@/features/auth/server";
import { ApiError } from "@/shared/lib/api-error";
import {
  RECOVERY_PERMISSIONS,
  executeLifecycleUseCase,
  type AtomicGapAction,
} from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly assignmentId: string;
  readonly action: string;
}
const actions: Readonly<Record<string, AtomicGapAction>> = {
  reassign: "assignment.reassign",
  accept: "assignment.accept",
  reject: "assignment.reject",
  complete: "assignment.complete",
};
export const POST = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.ASSIGNMENTS_MANAGE);
  const action = actions[p.action];
  if (!action) throw new ApiError("not_found", `Unknown assignment action: ${p.action}`);
  return apiOk(
    await executeLifecycleUseCase(action, p.assignmentId, await readJsonBody(r), {
      actor,
      correlationId: c,
    }),
    c,
  );
});
