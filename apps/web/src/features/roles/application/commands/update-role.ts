import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Role } from "../../domain/entities/role";
import { updateRoleSchema } from "../dto/role-schemas";
import type { RequestContext } from "../ports/request-context";
import type { RoleRepository } from "../ports/role-repository";

export interface UpdateRoleDeps {
  readonly repository: RoleRepository;
  readonly auditSink: AuditSink;
}

/** Updates a role's name/status. The role must exist within the caller's authorized partner scope. */
export async function updateRole(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdateRoleDeps,
): Promise<Role> {
  const input = updateRoleSchema.parse(rawInput);

  const existing = await deps.repository.findById(roleId);
  if (!existing) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  const updated = await deps.repository.update(roleId, input);
  if (!updated) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "role.update",
    resourceType: "iam.roles",
    resourceId: roleId,
    outcome: "success",
  });

  return updated;
}
