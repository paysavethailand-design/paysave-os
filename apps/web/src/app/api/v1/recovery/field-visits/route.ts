import { requireApiPermission } from "@/features/auth/server";
import { createFieldVisitUseCase, RECOVERY_PERMISSIONS } from "@/features/recovery-core/server";
import { apiCreated, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
export const POST = withApiRoute(async (r, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.ASSIGNMENTS_MANAGE);
  return apiCreated(
    await createFieldVisitUseCase(await readJsonBody(r), { actor, correlationId: c }),
    c,
  );
});
