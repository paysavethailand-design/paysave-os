import { requireApiPermission } from "@/features/auth/server";
import {
  createCustomerUseCase,
  CUSTOMERS_PERMISSIONS,
  listCustomersUseCase,
} from "@/features/customers/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists customers in a partner scope. Requires `customers.read`. `partnerId` query param is required for global admins. */
export const GET = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(CUSTOMERS_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const requestedPartnerId = request.nextUrl.searchParams.get("partnerId");
  const page = await listCustomersUseCase(pageRequest, requestedPartnerId, actor);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/** Creates a tenant-scoped customer. Requires `customers.manage`. */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(CUSTOMERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createCustomerUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
