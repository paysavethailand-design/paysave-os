import { requireApiPermission } from "@/features/auth/server";
import {
  appendTimelineUseCase,
  listTimelineUseCase,
  RECOVERY_PERMISSIONS,
} from "@/features/recovery-core/server";
import { apiCreated, apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";
interface P {
  readonly caseId: string;
}
export const GET = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_READ);
  const page = await listTimelineUseCase(p.caseId, Object.fromEntries(r.nextUrl.searchParams), {
    actor,
    correlationId: c,
  });
  return apiOk(page.items, c, { nextCursor: page.nextCursor });
});
export const POST = withApiParamsRoute<P>(async (r, p, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  return apiCreated(
    await appendTimelineUseCase(p.caseId, await readJsonBody(r), { actor, correlationId: c }),
    c,
  );
});
