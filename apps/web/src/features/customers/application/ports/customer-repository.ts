import type { Customer } from "../../domain/entities/customer";
import type { CreateCustomerInput, UpdateCustomerInput } from "../dto/customer-schemas";

export interface ListCustomersParams {
  readonly partnerId: string;
  readonly limit: number;
  readonly cursor: string | null;
}

export interface NewCustomerRecord extends CreateCustomerInput {
  readonly partnerId: string;
}

export interface DeleteCustomerFields {
  readonly deletedAt: string;
  readonly deletedBy: string;
  readonly deleteReason: string;
}

/**
 * Repository Pattern port for `crm.customers`. Reads/mutations of an existing customer key off
 * `id` alone and rely on RLS to filter visibility, mirroring the roles repository's pattern.
 * `normalized_name_hash` is a plain (non-unique) lookup index, not a uniqueness constraint, so no
 * duplicate-name check exists here — customers may share a display name.
 */
export interface CustomerRepository {
  list(params: ListCustomersParams): Promise<readonly Customer[]>;
  findById(customerId: string): Promise<Customer | null>;
  create(input: NewCustomerRecord): Promise<Customer>;
  update(customerId: string, input: UpdateCustomerInput): Promise<Customer | null>;
  /** Soft-deletes via `deleted_at`/`deleted_by`/`delete_reason`; RLS has no DELETE policy for this table. */
  softDelete(customerId: string, fields: DeleteCustomerFields): Promise<Customer | null>;
}
