import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { RolePermission } from "../../domain/entities/role-permission";
import { attachRolePermissionSchema } from "../dto/role-permission-schemas";
import type { RequestContext } from "../ports/request-context";
import type { RolePermissionRepository } from "../ports/role-permission-repository";
import type { RoleRepository } from "../ports/role-repository";

export interface AttachRolePermissionDeps {
  readonly roleRepository: RoleRepository;
  readonly rolePermissionRepository: RolePermissionRepository;
  readonly auditSink: AuditSink;
}

/** Grants a permission to a role. The role's own `partner_id` is authoritative, not a caller-supplied value. */
export async function attachRolePermission(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: AttachRolePermissionDeps,
): Promise<RolePermission> {
  const input = attachRolePermissionSchema.parse(rawInput);

  const role = await deps.roleRepository.findById(roleId);
  if (!role) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  const scope = resolveWritePartnerId(context.actor, role.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${role.partnerId}: ${scope.reason}`);
  }

  const existing = await deps.rolePermissionRepository.findByRoleAndPermission(
    scope.partnerId,
    roleId,
    input.permissionId,
  );
  if (existing) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: scope.partnerId,
      action: "role.permission.attach",
      resourceType: "iam.role_permissions",
      resourceId: existing.id,
      outcome: "denied",
      reason: "already_granted",
    });
    throw new ApiError("conflict", "This permission is already granted to the role");
  }

  const created = await deps.rolePermissionRepository.create({
    ...input,
    partnerId: scope.partnerId,
    roleId,
  });

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "role.permission.attach",
    resourceType: "iam.role_permissions",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}
