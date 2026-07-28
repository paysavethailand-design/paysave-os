import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Customer } from "../../domain/entities/customer";
import { createCustomerSchema } from "../dto/customer-schemas";
import type { CustomerRepository } from "../ports/customer-repository";
import type { RequestContext } from "../ports/request-context";

export interface CreateCustomerDeps {
  readonly repository: CustomerRepository;
  readonly auditSink: AuditSink;
}

/** Creates a tenant-scoped customer. The target partner is the caller's active partner unless the caller is a global admin. */
export async function createCustomer(
  rawInput: unknown,
  context: RequestContext,
  deps: CreateCustomerDeps,
): Promise<Customer> {
  const input = createCustomerSchema.parse(rawInput);

  const scope = resolveWritePartnerId(context.actor, input.partnerId ?? null);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const created = await deps.repository.create({ ...input, partnerId: scope.partnerId });
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "customer.create",
    resourceType: "crm.customers",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}
