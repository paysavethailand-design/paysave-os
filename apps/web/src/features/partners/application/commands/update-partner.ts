import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Partner } from "../../domain/entities/partner";
import { updatePartnerSchema } from "../dto/partner-schemas";
import type { PartnerRepository } from "../ports/partner-repository";
import type { RequestContext } from "../ports/request-context";

export interface UpdatePartnerDeps {
  readonly repository: PartnerRepository;
  readonly auditSink: AuditSink;
}

/** Updates a partner's own configuration. The partner's `id` is its own tenant scope. */
export async function updatePartner(
  partnerId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdatePartnerDeps,
): Promise<Partner> {
  const input = updatePartnerSchema.parse(rawInput);

  const existing = await deps.repository.findById(partnerId);
  if (!existing) {
    throw new ApiError("not_found", `Partner not found: ${partnerId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.id);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.id}: ${scope.reason}`);
  }

  const updated = await deps.repository.update(partnerId, input);
  if (!updated) {
    throw new ApiError("not_found", `Partner not found: ${partnerId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "partner.update",
    resourceType: "tenant.partners",
    resourceId: partnerId,
    outcome: "success",
  });

  return updated;
}
