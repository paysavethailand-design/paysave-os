import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Role } from "../../domain/entities/role";
import { deleteRoleSchema } from "../dto/role-schemas";
import type { Clock } from "../ports/clock";
import type { RequestContext } from "../ports/request-context";
import type { RoleRepository } from "../ports/role-repository";

export interface DeleteRoleDeps {
  readonly repository: RoleRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * Soft-deletes a role via `deleted_at`/`deleted_by`/`delete_reason`. `iam.roles` RLS grants no
 * DELETE policy (retirement/effective-dating only), so this never issues a SQL DELETE.
 */
export async function deleteRole(
  roleId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: DeleteRoleDeps,
): Promise<Role> {
  const input = deleteRoleSchema.parse(rawInput);

  const existing = await deps.repository.findById(roleId);
  if (!existing) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  const deleted = await deps.repository.softDelete(roleId, {
    deletedAt: deps.clock.now().toISOString(),
    deletedBy: context.actor.userId,
    deleteReason: input.reason,
  });
  if (!deleted) {
    throw new ApiError("not_found", `Role not found: ${roleId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "role.delete",
    resourceType: "iam.roles",
    resourceId: roleId,
    outcome: "success",
    reason: input.reason,
  });

  return deleted;
}
