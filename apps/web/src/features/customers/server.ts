import { ConsoleAuditSink } from "@paysave/observability";
import type { AuthContext } from "@paysave/security";
import { databaseProvider } from "@/shared/providers/database/server";
import type { BoundedPage, BoundedPageRequest } from "@/shared/lib/pagination";
import { createCustomer } from "./application/commands/create-customer";
import { deleteCustomer } from "./application/commands/delete-customer";
import { updateCustomer } from "./application/commands/update-customer";
import type { RequestContext } from "./application/ports/request-context";
import { getCustomer } from "./application/queries/get-customer";
import { listCustomers } from "./application/queries/list-customers";
import type { Customer } from "./domain/entities/customer";
import type { CustomerRepository } from "./application/ports/customer-repository";

const auditSink = new ConsoleAuditSink();
const clock = { now: () => new Date() };

async function repository(): Promise<CustomerRepository> {
  return databaseProvider().repositories.customers();
}

/** Server-only public API composition root for the customers feature. */
export async function listCustomersUseCase(
  pageRequest: BoundedPageRequest,
  requestedPartnerId: string | null,
  actor: AuthContext,
): Promise<BoundedPage<Customer>> {
  return listCustomers(pageRequest, requestedPartnerId, actor, await repository());
}

export async function getCustomerUseCase(customerId: string): Promise<Customer> {
  return getCustomer(customerId, await repository());
}

export async function createCustomerUseCase(
  rawInput: unknown,
  context: RequestContext,
): Promise<Customer> {
  return createCustomer(rawInput, context, { repository: await repository(), auditSink });
}

export async function updateCustomerUseCase(
  customerId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Customer> {
  return updateCustomer(customerId, rawInput, context, {
    repository: await repository(),
    auditSink,
  });
}

export async function deleteCustomerUseCase(
  customerId: string,
  rawInput: unknown,
  context: RequestContext,
): Promise<Customer> {
  return deleteCustomer(customerId, rawInput, context, {
    repository: await repository(),
    auditSink,
    clock,
  });
}

export type { Customer } from "./domain/entities/customer";
export { CUSTOMERS_PERMISSIONS } from "./domain/customer-codes";
export type { RequestContext } from "./application/ports/request-context";
