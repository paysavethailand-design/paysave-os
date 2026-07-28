import { requireApiPermission } from "@/features/auth/server";
import { appendVisitResultUseCase, RECOVERY_PERMISSIONS } from "@/features/recovery-core/server";
import { apiCreated, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly visitId: string;
}
export const POST = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.ASSIGNMENTS_MANAGE);
  return apiCreated(
    await appendVisitResultUseCase(p.visitId, await readJsonBody(r), { actor, correlationId: c }),
    c,
  );
});
