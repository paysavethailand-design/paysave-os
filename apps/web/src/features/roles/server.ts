import { ConsoleAuditSink } from "@paysave/observability";
import type { AuthContext } from "@paysave/security";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { attachRolePermission } from "./application/commands/attach-role-permission";
import { createRole } from "./application/commands/create-role";
import { deleteRole } from "./application/commands/delete-role";
import { detachRolePermission } from "./application/commands/detach-role-permission";
import { updateRole } from "./application/commands/update-role";
import type { RequestContext } from "./application/ports/request-context";
import { getRole } from "./application/queries/get-role";
import { listRolePermissions } from "./application/queries/list-role-permissions";
import { listRoles } from "./application/queries/list-roles";
import type { Role } from "./domain/entities/role";
import type { RolePermission } from "./domain/entities/role-permission";
import type { RolePermissionRepository } from "./application/ports/role-permission-repository";
import type { RoleRepository } from "./application/ports/role-repository";

const auditSink = new ConsoleAuditSink();
const clock = { now: () => new Date() };

async function repositories(): Promise<{
  roleRepository: RoleRepository;
  rolePermissionRepository: RolePermissionRepository;
}> {
  return databaseProvider().repositories.roles();
}

/** Server-only public API composition root for the roles feature. */
export async function listRolesUseCase(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
): Promise<BoundedPage<Role>> {
  const { roleRepository } = await repositories();
  return listRoles(pageRequest, requestedPartnerId, actor, roleRepository);
}

export async function getRoleUseCase(roleId: string): Promise<Role> {
  const { roleRepository } = await repositories();
  return getRole(roleId, roleRepository);
}

export async function createRoleUseCase(rawInput: unknown, context: RequestContext): Promise<Role> {
  const { roleRepository } = await repositories();
  return createRole(rawInput, context, { repository: roleRepository, auditSink });
}

export async function updateRoleUseCase(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Role> {
  const { roleRepository } = await repositories();
  return updateRole(roleId, rawInput, context, { repository: roleRepository, auditSink });
}

export async function deleteRoleUseCase(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Role> {
  const { roleRepository } = await repositories();
  return deleteRole(roleId, rawInput, context, { repository: roleRepository, auditSink, clock });
}

export async function listRolePermissionsUseCase(
  roleId: string,
  actor: AuthContext,
): Promise<readonly RolePermission[]> {
  const { roleRepository, rolePermissionRepository } = await repositories();
  return listRolePermissions(roleId, actor, roleRepository, rolePermissionRepository);
}

export async function attachRolePermissionUseCase(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<RolePermission> {
  const { roleRepository, rolePermissionRepository } = await repositories();
  return attachRolePermission(roleId, rawInput, context, {
    roleRepository,
    rolePermissionRepository,
    auditSink,
  });
}

export async function detachRolePermissionUseCase(
  roleId: string,
  permissionId: string,
  context: RequestContext,
): Promise<never> {
  const { roleRepository, rolePermissionRepository } = await repositories();
  return detachRolePermission(roleId, permissionId, context, {
    roleRepository,
    rolePermissionRepository,
    auditSink,
  });
}

export type { Role } from "./domain/entities/role";
export type { RolePermission } from "./domain/entities/role-permission";
export { ROLES_PERMISSIONS } from "./domain/role-codes";
export type { RequestContext } from "./application/ports/request-context";
