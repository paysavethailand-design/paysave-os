import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreatePartnerInput, UpdatePartnerInput } from "../../application/dto/partner-schemas";
import type {
  DeletePartnerFields,
  ListPartnersParams,
  PartnerRepository,
} from "../../application/ports/partner-repository";
import type { Partner } from "../../domain/entities/partner";
import { partnerRowSchema, toPartner } from "./partner-row";

const SCHEMA = "tenant";
const TABLE = "partners";
const COLUMNS =
  "id, code, name, status, timezone, default_currency, created_at, updated_at, deleted_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `tenant.partners` Repository Pattern implementation using the request-scoped, RLS-bound Supabase client. */
export class SupabasePartnerRepository implements PartnerRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(params: ListPartnersParams): Promise<readonly Partner[]> {
    let query = this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .is("deleted_at", null)
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (params.cursor) {
      query = query.gt("id", params.cursor);
    }

    const { data, error } = await query;
    assertNoError(error, "Failed to list partners");
    return ((data ?? []) as readonly unknown[]).map((row) =>
      toPartner(partnerRowSchema.parse(row)),
    );
  }

  async findById(id: string): Promise<Partner | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoError(error, "Failed to load partner");
    return data ? toPartner(partnerRowSchema.parse(data)) : null;
  }

  async findByCode(code: string): Promise<Partner | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoError(error, "Failed to load partner by code");
    return data ? toPartner(partnerRowSchema.parse(data)) : null;
  }

  async create(input: CreatePartnerInput): Promise<Partner> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert({
        code: input.code,
        name: input.name,
        status: input.status,
        timezone: input.timezone,
        default_currency: input.defaultCurrency,
      })
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create partner");
    return toPartner(partnerRowSchema.parse(data));
  }

  async update(id: string, input: UpdatePartnerInput): Promise<Partner | null> {
    const payload: Record<string, string> = {};
    if (input.name !== undefined) payload.name = input.name;
    if (input.status !== undefined) payload.status = input.status;
    if (input.timezone !== undefined) payload.timezone = input.timezone;
    if (input.defaultCurrency !== undefined) payload.default_currency = input.defaultCurrency;

    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to update partner");
    return data ? toPartner(partnerRowSchema.parse(data)) : null;
  }

  async softDelete(id: string, fields: DeletePartnerFields): Promise<Partner | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update({
        deleted_at: fields.deletedAt,
        deleted_by: fields.deletedBy,
        delete_reason: fields.deleteReason,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to delete partner");
    return data ? toPartner(partnerRowSchema.parse(data)) : null;
  }
}
