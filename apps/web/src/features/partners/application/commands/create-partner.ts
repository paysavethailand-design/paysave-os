import type { AuditSink } from "@paysave/observability";
import { ApiError } from "@/shared/lib/api-error";
import type { Partner } from "../../domain/entities/partner";
import { createPartnerSchema } from "../dto/partner-schemas";
import type { PartnerRepository } from "../ports/partner-repository";
import type { RequestContext } from "../ports/request-context";

export interface CreatePartnerDeps {
  readonly repository: PartnerRepository;
  readonly auditSink: AuditSink;
}

/**
 * Creates a new tenant root. `tenant.partners` RLS only allows INSERT when
 * `admin.is_global_admin()`, so a non-global-admin session is rejected explicitly here with a
 * clear 403 instead of an opaque RLS failure surfacing as a 500.
 */
export async function createPartner(
  rawInput: unknown,
  context: RequestContext,
  deps: CreatePartnerDeps,
): Promise<Partner> {
  const input = createPartnerSchema.parse(rawInput);

  if (context.actor.tenantScope !== "all") {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: null,
      action: "partner.create",
      resourceType: "tenant.partners",
      resourceId: null,
      outcome: "denied",
      reason: "not_global_admin",
    });
    throw new ApiError("forbidden", "Creating a partner requires global administrator scope");
  }

  const existing = await deps.repository.findByCode(input.code);
  if (existing) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: existing.id,
      action: "partner.create",
      resourceType: "tenant.partners",
      resourceId: existing.id,
      outcome: "denied",
      reason: "duplicate_code",
    });
    throw new ApiError("conflict", `Partner code already exists: ${input.code}`);
  }

  const created = await deps.repository.create(input);
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: created.id,
    action: "partner.create",
    resourceType: "tenant.partners",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}
