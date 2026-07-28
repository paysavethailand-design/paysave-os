import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import { ApiError } from "@/shared/lib/api-error";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";

/**
 * Lists roles within a partner scope. `resolveWritePartnerId` names the write case, but the same
 * "which partner may this session touch" decision applies to a scoped list query.
 */
export async function listRoles(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
  repository: RoleRepository,
): Promise<BoundedPage<Role>> {
  const scope = resolveWritePartnerId(actor, requestedPartnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const rows = await repository.list({ partnerId: scope.partnerId, ...pageRequest });
  return toBoundedPage(rows, pageRequest.limit);
}
