import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Role } from "../../domain/entities/role";
import { createRoleSchema } from "../dto/role-schemas";
import type { RequestContext } from "../ports/request-context";
import type { RoleRepository } from "../ports/role-repository";

export interface CreateRoleDeps {
  readonly repository: RoleRepository;
  readonly auditSink: AuditSink;
}

/** Creates a tenant-scoped role. The target partner is the caller's active partner unless the caller is a global admin. */
export async function createRole(
  rawInput: unknown,
  context: RequestContext,
  deps: CreateRoleDeps,
): Promise<Role> {
  const input = createRoleSchema.parse(rawInput);

  const scope = resolveWritePartnerId(context.actor, input.partnerId ?? null);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const existing = await deps.repository.findByCode(scope.partnerId, input.code);
  if (existing) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: scope.partnerId,
      action: "role.create",
      resourceType: "iam.roles",
      resourceId: existing.id,
      outcome: "denied",
      reason: "duplicate_code",
    });
    throw new ApiError("conflict", `Role code already exists for this partner: ${input.code}`);
  }

  const created = await deps.repository.create({ ...input, partnerId: scope.partnerId });
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "role.create",
    resourceType: "iam.roles",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}
