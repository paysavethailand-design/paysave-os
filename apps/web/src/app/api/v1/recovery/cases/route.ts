import { requireApiPermission } from "@/features/auth/server";
import {
  createCaseUseCase,
  listCasesUseCase,
  RECOVERY_PERMISSIONS,
} from "@/features/recovery-core/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
export const GET = withApiRoute(async (request, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_READ);
  const page = await listCasesUseCase(Object.fromEntries(request.nextUrl.searchParams), {
    actor,
    correlationId: c,
  });
  return apiOk(page.items, c, { nextCursor: page.nextCursor });
});
export const POST = withApiRoute(async (request, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  return apiCreated(
    await createCaseUseCase(await readJsonBody(request), { actor, correlationId: c }),
    c,
  );
});
