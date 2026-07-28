import { z } from "zod";
import { requireApiPermission } from "@/features/auth/server";
import { RECOVERY_PERMISSIONS, executeLifecycleUseCase } from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
const schema = z.object({
  instanceId: z.uuid(),
  expectedVersionNo: z.int().positive(),
  currentStateId: z.uuid(),
  actionCode: z.string().trim().min(1).max(100),
});
export const POST = withApiRoute(async (r, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_MANAGE);
  const b = schema.parse(await readJsonBody(r));
  return apiOk(
    await executeLifecycleUseCase("workflow.transition", b.instanceId, b, {
      actor,
      correlationId: c,
    }),
    c,
  );
});
