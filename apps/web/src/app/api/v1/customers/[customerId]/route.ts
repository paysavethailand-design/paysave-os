import { requireApiPermission } from "@/features/auth/server";
import {
  CUSTOMERS_PERMISSIONS,
  deleteCustomerUseCase,
  getCustomerUseCase,
  updateCustomerUseCase,
} from "@/features/customers/server";
import { apiOk, readJsonBody, withApiParamsRoute } from "@/shared/lib/api-response";

interface RouteParams {
  readonly customerId: string;
}

/** Returns a single customer. Requires `customers.read`. */
export const GET = withApiParamsRoute<RouteParams>(async (_request, params, correlationId) => {
  await requireApiPermission(CUSTOMERS_PERMISSIONS.READ);
  const customer = await getCustomerUseCase(params.customerId);
  return apiOk(customer, correlationId);
});

/** Updates a customer's display name/status. Requires `customers.manage`. */
export const PATCH = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(CUSTOMERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const updated = await updateCustomerUseCase(params.customerId, body, { actor, correlationId });
  return apiOk(updated, correlationId);
});

/**
 * Soft-deletes a customer (`deleted_at`/`deleted_by`/`delete_reason`). Requires `customers.manage`
 * and a non-empty `reason` — `crm.customers` has no DELETE RLS policy, only UPDATE.
 */
export const DELETE = withApiParamsRoute<RouteParams>(async (request, params, correlationId) => {
  const actor = await requireApiPermission(CUSTOMERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const deleted = await deleteCustomerUseCase(params.customerId, body, { actor, correlationId });
  return apiOk(deleted, correlationId);
});
