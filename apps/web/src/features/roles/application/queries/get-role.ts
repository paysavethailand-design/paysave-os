import { ApiError } from "@/shared/lib/api-error";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";

/** Returns a single role or throws a 404 ApiError. RLS already restricts visibility to the authorized partner. */
export async function getRole(roleId: string, repository: RoleRepository): Promise<Role> {
  const role = await repository.findById(roleId);
  if (!role) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }
  return role;
}
