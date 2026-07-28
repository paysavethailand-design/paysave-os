import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Partner } from "../../domain/entities/partner";
import { deletePartnerSchema } from "../dto/partner-schemas";
import type { Clock } from "../ports/clock";
import type { PartnerRepository } from "../ports/partner-repository";
import type { RequestContext } from "../ports/request-context";

export interface DeletePartnerDeps {
  readonly repository: PartnerRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * Soft-deletes (retires) a partner via `deleted_at`/`deleted_by`/`delete_reason`. `tenant.partners`
 * RLS grants no DELETE policy, only UPDATE, so this never issues a SQL DELETE.
 */
export async function deletePartner(
  partnerId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: DeletePartnerDeps,
): Promise<Partner> {
  const input = deletePartnerSchema.parse(rawInput);

  const existing = await deps.repository.findById(partnerId);
  if (!existing) {
    throw new ApiError("not_found", `Partner not found: ${partnerId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.id);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.id}: ${scope.reason}`);
  }

  const deleted = await deps.repository.softDelete(partnerId, {
    deletedAt: deps.clock.now().toISOString(),
    deletedBy: context.actor.userId,
    deleteReason: input.reason,
  });
  if (!deleted) {
    throw new ApiError("not_found", `Partner not found: ${partnerId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "partner.delete",
    resourceType: "tenant.partners",
    resourceId: partnerId,
    outcome: "success",
    reason: input.reason,
  });

  return deleted;
}
