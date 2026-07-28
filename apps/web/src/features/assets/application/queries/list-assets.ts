import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";

/** Lists assets within a partner scope. */
export async function listAssets(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
  repository: AssetRepository,
): Promise<BoundedPage<Asset>> {
  const scope = resolveWritePartnerId(actor, requestedPartnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const rows = await repository.list({ partnerId: scope.partnerId, ...pageRequest });
  return toBoundedPage(rows, pageRequest.limit);
}
