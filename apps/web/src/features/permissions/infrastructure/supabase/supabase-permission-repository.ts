import type { SupabaseClient } from "@supabase/supabase-js";
import type { Permission } from "../../domain/entities/permission";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from "../../application/dto/permission-schemas";
import type {
  ListPermissionsParams,
  PermissionRepository,
} from "../../application/ports/permission-repository";
import { permissionRowSchema, toPermission } from "./permission-row";

const SCHEMA = "iam";
const TABLE = "permissions";
const COLUMNS = "id, code, resource, action, created_at, updated_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `iam.permissions` Repository Pattern implementation using the request-scoped, RLS-bound Supabase client. */
export class SupabasePermissionRepository implements PermissionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(params: ListPermissionsParams): Promise<readonly Permission[]> {
    let query = this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (params.cursor) {
      query = query.gt("id", params.cursor);
    }

    const { data, error } = await query;
    assertNoError(error, "Failed to list permissions");
    return ((data ?? []) as readonly unknown[]).map((row) =>
      toPermission(permissionRowSchema.parse(row)),
    );
  }

  async findById(id: string): Promise<Permission | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "Failed to load permission");
    return data ? toPermission(permissionRowSchema.parse(data)) : null;
  }

  async findByCode(code: string): Promise<Permission | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("code", code)
      .maybeSingle();
    assertNoError(error, "Failed to load permission by code");
    return data ? toPermission(permissionRowSchema.parse(data)) : null;
  }

  async create(input: CreatePermissionInput): Promise<Permission> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert({ code: input.code, resource: input.resource, action: input.action })
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create permission");
    return toPermission(permissionRowSchema.parse(data));
  }

  async update(id: string, input: UpdatePermissionInput): Promise<Permission | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .update(input)
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    assertNoError(error, "Failed to update permission");
    return data ? toPermission(permissionRowSchema.parse(data)) : null;
  }
}
