import { toBoundedPage, type BoundedPage, type BoundedPageRequest } from "@/shared/lib/pagination";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";

/** Lists users with bounded keyset pagination. */
export async function listUsers(
  pageRequest: BoundedPageRequest,
  repository: UserRepository,
): Promise<BoundedPage<User>> {
  const rows = await repository.list(pageRequest);
  return toBoundedPage(rows, pageRequest.limit);
}
