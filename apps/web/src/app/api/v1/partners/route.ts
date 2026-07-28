import { requireApiPermission } from "@/features/auth/server";
import {
  createPartnerUseCase,
  listPartnersUseCase,
  PARTNERS_PERMISSIONS,
} from "@/features/partners/server";
import { apiCreated, apiOk, readJsonBody, withApiRoute } from "@/shared/lib/api-response";
import { parseBoundedPageRequest } from "@/shared/lib/pagination";

/** Lists partners visible to the caller (RLS scopes this to the caller's own partner unless global admin). Requires `partners.read`. */
export const GET = withApiRoute(async (request, correlationId) => {
  await requireApiPermission(PARTNERS_PERMISSIONS.READ);
  const pageRequest = parseBoundedPageRequest(request.nextUrl.searchParams);
  const page = await listPartnersUseCase(pageRequest);
  return apiOk(page.items, correlationId, { nextCursor: page.nextCursor });
});

/** Creates a new tenant root. Requires `partners.manage` and global administrator scope. */
export const POST = withApiRoute(async (request, correlationId) => {
  const actor = await requireApiPermission(PARTNERS_PERMISSIONS.MANAGE);
  const body = await readJsonBody(request);
  const created = await createPartnerUseCase(body, { actor, correlationId });
  return apiCreated(created, correlationId);
});
