import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Customer } from "../../domain/entities/customer";
import { updateCustomerSchema } from "../dto/customer-schemas";
import type { CustomerRepository } from "../ports/customer-repository";
import type { RequestContext } from "../ports/request-context";

export interface UpdateCustomerDeps {
  readonly repository: CustomerRepository;
  readonly auditSink: AuditSink;
}

/** Updates a customer's display name and/or status. */
export async function updateCustomer(
  customerId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdateCustomerDeps,
): Promise<Customer> {
  const input = updateCustomerSchema.parse(rawInput);

  const existing = await deps.repository.findById(customerId);
  if (!existing) {
    throw new ApiError("not_found", `Customer not found: ${customerId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  const updated = await deps.repository.update(customerId, input);
  if (!updated) {
    throw new ApiError("not_found", `Customer not found: ${customerId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "customer.update",
    resourceType: "crm.customers",
    resourceId: customerId,
    outcome: "success",
  });

  return updated;
}
