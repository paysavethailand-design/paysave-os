import { z } from "zod";
import { requireApiPermission } from "@/features/auth/server";
import {
  listTransitionsUseCase,
  RECOVERY_PERMISSIONS,
  validateTransitionUseCase,
} from "@/features/recovery-core/server";
import { apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
const schema = z.object({
  partnerId: z.uuid().nullable().optional(),
  instanceId: z.uuid(),
  currentStateId: z.uuid(),
  actionCode: z.string().trim().min(1).max(100),
});
export const POST = withApiRoute(async (r, c) => {
  const actor = await requireApiPermission(RECOVERY_PERMISSIONS.CASES_READ);
  const b = schema.parse(await readJsonBody(r));
  const transitions = await listTransitionsUseCase(b.instanceId, b.partnerId ?? null, {
    actor,
    correlationId: c,
  });
  return apiOk(
    await validateTransitionUseCase(transitions, b.currentStateId, b.actionCode, {
      actor,
      correlationId: c,
    }),
    c,
  );
});
