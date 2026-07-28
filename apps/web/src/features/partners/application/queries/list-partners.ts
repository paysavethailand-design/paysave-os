import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";

/** Lists partners with bounded keyset pagination. RLS filters to the caller's authorized partner(s). */
export async function listPartners(
  pageRequest: BoundedPageRequest,
  repository: PartnerRepository,
): Promise<BoundedPage<Partner>> {
  const rows = await repository.list(pageRequest);
  return toBoundedPage(rows, pageRequest.limit);
}
