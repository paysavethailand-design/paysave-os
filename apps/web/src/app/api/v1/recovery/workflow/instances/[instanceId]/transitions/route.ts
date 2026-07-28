import { requireApiPermission } from "@/features/auth/server";
import { listTransitionsUseCase, RECOVERY_PERMISSIONS } from "@/features/recovery-core/server";
import { apiOk, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly instanceId: string;
}
export const GET = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_READ);
  return apiOk(
    await listTransitionsUseCase(p.instanceId, r.nextUrl.searchParams.get("partnerId"), {
      actor,
      correlationId: c,
    }),
    c,
  );
});
