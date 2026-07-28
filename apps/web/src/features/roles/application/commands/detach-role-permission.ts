import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { RequestContext } from "../ports/request-context";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";

export interface DetachRolePermissionDeps {
  readonly roleRepository: RoleRepository;
  readonly rolePermissionRepository: RolePermissionRepository;
  readonly auditSink: AuditSink;
}

/**
 * Permission revocation is not supported in Sprint #1: `iam.role_permissions` (M003, Batch #1) has
 * no `deleted_at`/`valid_to` column and its RLS policies grant only SELECT/INSERT/UPDATE, so there
 * is no DML path — with or without RLS — that removes a grant row. Fixing this needs a Physical
 * Schema amendment, which is out of scope ("do not modify database schema/migrations").
 *
 * This still validates the request shape and authorization (auth, permission, tenant scope, and
 * that the grant exists) before reporting the gap, so callers get an accurate 404/403 instead of a
 * misleading 501 when the real problem is something else.
 */
export async function detachRolePermission(
  roleId: string,
  permissionId: string,
  context: RequestContext,
  deps: DetachRolePermissionDeps,
): Promise<never> {
  const role = await deps.roleRepository.findById(roleId);
  if (!role) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  const scope = resolveWritePartnerId(context.actor, role.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${role.partnerId}: ${scope.reason}`);
  }

  const grant = await deps.rolePermissionRepository.findByRoleAndPermission(
    scope.partnerId,
    roleId,
    permissionId,
  );
  if (!grant) {
    throw new ApiError("not_found", "This permission is not granted to the role");
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "role.permission.detach",
    resourceType: "iam.role_permissions",
    resourceId: grant.id,
    outcome: "denied",
    reason: "unsupported_by_schema",
  });

  throw new ApiError(
    "not_implemented",
    "Revoking a role permission grant requires a Physical Schema amendment (no deleted_at/valid_to column or DELETE RLS policy exists for iam.role_permissions) and is out of scope for Backend Sprint #1.",
  );
}
