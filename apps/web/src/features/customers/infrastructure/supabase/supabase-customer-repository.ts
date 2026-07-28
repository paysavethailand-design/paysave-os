import type { FieldEncryptionKey } from "@paysave/security/crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UpdateCustomerInput } from "../../application/dto/customer-schemas";
import type {
  DeleteCustomerFields,
  ListCustomersParams,
  NewCustomerRecord,
  CustomerRepository,
} from "../../application/ports/customer-repository";
import type { Customer } from "../../domain/entities/customer";
import { customerRowSchema, toCustomer, toInsertPayload, toUpdatePayload } from "./customer-row";

const SCHEMA = "crm";
const TABLE = "customers";
const COLUMNS =
  "id, partner_id, customer_type, display_name_encrypted, status, created_at, updated_at, deleted_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `crm.customers` Repository Pattern implementation using the request-scoped, RLS-bound Supabase client. */
export class SupabaseCustomerRepository implements CustomerRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly encryptionKey: FieldEncryptionKey,
  ) {}

  async list(params: ListCustomersParams): Promise<readonly Customer[]> {
    let query = this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("partner_id", params.partnerId)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (params.cursor) {
      query = query.gt("id", params.cursor);
    }

    const { data, error } = await query;
    assertNoError(error, "Failed to list customers");
    return ((data ?? []) as readonly unknown[]).map((row) =>
      toCustomer(customerRowSchema.parse(row), this.encryptionKey),
    );
  }

  async findById(customerId: string): Promise<Customer | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", customerId)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoError(error, "Failed to load customer");
    return data ? toCustomer(customerRowSchema.parse(data), this.encryptionKey) : null;
  }

  async create(input: NewCustomerRecord): Promise<Customer> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert(toInsertPayload(input, this.encryptionKey))
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create customer");
    return toCustomer(customerRowSchema.parse(data), this.encryptionKey);
  }

  async update(customerId: string, input: UpdateCustomerInput): Promise<Customer | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update(toUpdatePayload(input, this.encryptionKey))
      .eq("id", customerId)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to update customer");
    return data ? toCustomer(customerRowSchema.parse(data), this.encryptionKey) : null;
  }

  async softDelete(customerId: string, fields: DeleteCustomerFields): Promise<Customer | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update({
        deleted_at: fields.deletedAt,
        deleted_by: fields.deletedBy,
        delete_reason: fields.deleteReason,
      })
      .eq("id", customerId)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to delete customer");
    return data ? toCustomer(customerRowSchema.parse(data), this.encryptionKey) : null;
  }
}
