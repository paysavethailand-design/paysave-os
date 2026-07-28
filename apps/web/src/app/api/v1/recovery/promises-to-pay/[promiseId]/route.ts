import { requireApiPermission } from "@/features/auth/server";
import { RECOVERY_PERMISSIONS, updatePromiseUseCase } from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly promiseId: string;
}
export const PATCH = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  return apiOk(
    await updatePromiseUseCase(p.promiseId, await readJsonBody(r), { actor, correlationId: c }),
    c,
  );
});
