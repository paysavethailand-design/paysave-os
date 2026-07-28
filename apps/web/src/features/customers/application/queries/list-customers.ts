import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import { ApiError } from "@/shared/lib/api-error";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";

/** Lists customers within a partner scope. */
export async function listCustomers(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
  repository: CustomerRepository,
): Promise<BoundedPage<Customer>> {
  const scope = resolveWritePartnerId(actor, requestedPartnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const rows = await repository.list({ partnerId: scope.partnerId, ...pageRequest });
  return toBoundedPage(rows, pageRequest.limit);
}
