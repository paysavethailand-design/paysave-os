import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import type { Permission } from "../../domain/entities/permission";
import type { PermissionRepository } from "../ports/permission-repository";

/** Lists permissions with bounded keyset pagination. */
export async function listPermissions(
  pageRequest: BoundedPageRequest,
  repository: PermissionRepository,
): Promise<BoundedPage<Permission>> {
  const rows = await repository.list(pageRequest);
  return toBoundedPage(rows, pageRequest.limit);
}
