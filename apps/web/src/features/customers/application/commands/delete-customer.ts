import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Customer } from "../../domain/entities/customer";
import { deleteCustomerSchema } from "../dto/customer-schemas";
import type { Clock } from "../ports/clock";
import type { CustomerRepository } from "../ports/customer-repository";
import type { RequestContext } from "../ports/request-context";

export interface DeleteCustomerDeps {
  readonly repository: CustomerRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * Soft-deletes a customer via `deleted_at`/`deleted_by`/`delete_reason`. `crm.customers` RLS grants
 * no DELETE policy, only UPDATE, so this never issues a SQL DELETE.
 */
export async function deleteCustomer(
  customerId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: DeleteCustomerDeps,
): Promise<Customer> {
  const input = deleteCustomerSchema.parse(rawInput);

  const existing = await deps.repository.findById(customerId);
  if (!existing) {
    throw new ApiError("not_found", `Customer not found: ${customerId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  const deleted = await deps.repository.softDelete(customerId, {
    deletedAt: deps.clock.now().toISOString(),
    deletedBy: context.actor.userId,
    deleteReason: input.reason,
  });
  if (!deleted) {
    throw new ApiError("not_found", `Customer not found: ${customerId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "customer.delete",
    resourceType: "crm.customers",
    resourceId: customerId,
    outcome: "success",
    reason: input.reason,
  });

  return deleted;
}
