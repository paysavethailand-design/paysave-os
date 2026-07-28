import { ApiError } from "@/shared/lib/api-error";
import type { Customer } from "../../domain/entities/customer";
import type { CustomerRepository } from "../ports/customer-repository";

/** Returns a single customer or throws a 404 ApiError. RLS already restricts visibility. */
export async function getCustomer(
  customerId: string,
  repository: CustomerRepository,
): Promise<Customer> {
  const customer = await repository.findById(customerId);
  if (!customer) {
    throw new ApiError("not_found", `Customer not found: ${customerId}`);
  }
  return customer;
}
