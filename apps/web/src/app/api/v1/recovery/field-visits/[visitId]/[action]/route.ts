import { requireApiPermission } from "@/features/auth/server";
import { ApiError } from "@/shared/lib/api-error";
import { checkpointFieldVisitUseCase, RECOVERY_PERMISSIONS } from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly visitId: string;
  readonly action: string;
}
const actions = { "check-in": "check_in", "check-out": "check_out" } as const;
export const POST = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.ASSIGNMENTS_MANAGE);
  const action = actions[p.action as keyof typeof actions];
  if (!action) throw new ApiError("not_found", `Unknown field visit action: ${p.action}`);
  return apiOk(
    await checkpointFieldVisitUseCase(p.visitId, action, await readJsonBody(r), {
      actor,
      correlationId: c,
    }),
    c,
  );
});
