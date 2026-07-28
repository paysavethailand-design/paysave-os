import { requireApiPermission } from "@/features/auth/server";
import {
  getCaseUseCase,
  RECOVERY_PERMISSIONS,
  updateCaseUseCase,
} from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly caseId: string;
}
export const GET = withApiParamsRoute<P>(async (_r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_READ);
  return apiOk(await getCaseUseCase(p.caseId, { actor, correlationId: c }), c);
});
export const PATCH = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  return apiOk(
    await updateCaseUseCase(p.caseId, await readJsonBody(r), { actor, correlationId: c }),
    c,
  );
});
