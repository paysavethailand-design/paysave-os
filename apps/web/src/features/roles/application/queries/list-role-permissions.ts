import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { RolePermission } from "../../domain/entities/role-permission";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";

/** Lists the permissions granted to a role. */
export async function listRolePermissions(
  roleId: string,
  actor: AuthContext,
  roleRepository: RoleRepository,
  rolePermissionRepository: RolePermissionRepository,
): Promise<readonly RolePermission[]> {
  const role = await roleRepository.findById(roleId);
  if (!role) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  const scope = resolveWritePartnerId(actor, role.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${role.partnerId}: ${scope.reason}`);
  }

  return rolePermissionRepository.listByRole(scope.partnerId, roleId);
}
