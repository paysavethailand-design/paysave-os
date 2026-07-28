import { requireApiPermission } from "@/features/auth/server";
import {
  deletePartnerUseCase,
  getPartnerUseCase,
  PARTNERS_PERMISSIONS,
  updatePartnerUseCase,
} from "@/features/partners/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly partnerId: string;
}

/** Returns a single partner. Requires `partners.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(PARTNERS_PERMISSIONS.READ);
  const partner = await getPartnerUseCase(params.partnerId);
  return apiOk(partner, correlationId);
});

/** Updates a partner's configuration. Requires `partners.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(PARTNERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updatePartnerUseCase(params.partnerId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});

/**
 * Retires a partner (`deleted_at`/`deleted_by`/`delete_reason`). Requires `partners.manage` and a
 * non-empty `reason` — `tenant.partners` has no DELETE RLS policy, only UPDATE.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(PARTNERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const deleted = await deletePartnerUseCase(params.partnerId, body, { actor, correlationId });
  return apiOk(deleted, correlationId);
});
