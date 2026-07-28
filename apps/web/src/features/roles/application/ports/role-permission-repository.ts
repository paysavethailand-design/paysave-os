import type { RolePermission } from "../../domain/entities/role-permission";
import type { AttachRolePermissionInput } from "../dto/role-permission-schemas";

export interface NewRolePermissionRecord extends AttachRolePermissionInput {
  readonly partnerId: string;
  readonly roleId: string;
}

/**
 * Repository Pattern port for `iam.role_permissions`. The table has no `deleted_at` column and RLS
 * grants only SELECT/INSERT/UPDATE (Batch #1 M003), so this port intentionally has no `remove`
 * method — see `detachRolePermission` for why revocation is not supported this sprint.
 */
export interface RolePermissionRepository {
  listByRole(partnerId: string, roleId: string): Promise<readonly RolePermission[]>;
  findByRoleAndPermission(
    partnerId: string,
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null>;
  create(input: NewRolePermissionRecord): Promise<RolePermission>;
}
