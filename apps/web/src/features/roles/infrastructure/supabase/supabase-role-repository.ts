import type { SupabaseClient } from "@supabase/supabase-js";
import type { UpdateRoleInput } from "../../application/dto/role-schemas";
import type {
  DeleteRoleFields,
  ListRolesParams,
  NewRoleRecord,
  RoleRepository,
} from "../../application/ports/role-repository";
import type { Role } from "../../domain/entities/role";
import { roleRowSchema, toRole } from "./role-row";

const SCHEMA = "iam";
const TABLE = "roles";
const COLUMNS =
  "id, partner_id, template_id, code, name, status, created_at, updated_at, deleted_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `iam.roles` Repository Pattern implementation using the request-scoped, RLS-bound Supabase client. */
export class SupabaseRoleRepository implements RoleRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(params: ListRolesParams): Promise<readonly Role[]> {
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
    assertNoError(error, "Failed to list roles");
    return ((data ?? []) as readonly unknown[]).map((row) => toRole(roleRowSchema.parse(row)));
  }

  async findById(roleId: string): Promise<Role | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", roleId)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoError(error, "Failed to load role");
    return data ? toRole(roleRowSchema.parse(data)) : null;
  }

  async findByCode(partnerId: string, code: string): Promise<Role | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("partner_id", partnerId)
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle();
    assertNoError(error, "Failed to load role by code");
    return data ? toRole(roleRowSchema.parse(data)) : null;
  }

  async create(input: NewRoleRecord): Promise<Role> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert({
        partner_id: input.partnerId,
        template_id: input.templateId ?? null,
        code: input.code,
        name: input.name,
        status: input.status,
      })
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create role");
    return toRole(roleRowSchema.parse(data));
  }

  async update(roleId: string, input: UpdateRoleInput): Promise<Role | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update(input)
      .eq("id", roleId)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to update role");
    return data ? toRole(roleRowSchema.parse(data)) : null;
  }

  async softDelete(roleId: string, fields: DeleteRoleFields): Promise<Role | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update({
        deleted_at: fields.deletedAt,
        deleted_by: fields.deletedBy,
        delete_reason: fields.deleteReason,
      })
      .eq("id", roleId)
      .is("deleted_at", null)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to delete role");
    return data ? toRole(roleRowSchema.parse(data)) : null;
  }
}
