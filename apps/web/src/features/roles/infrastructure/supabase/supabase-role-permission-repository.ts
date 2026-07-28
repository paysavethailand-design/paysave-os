import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewRolePermissionRecord,
  RolePermissionRepository,
} from "../../application/ports/role-permission-repository";
import type { RolePermission } from "../../domain/entities/role-permission";
import { rolePermissionRowSchema, toRolePermission } from "./role-permission-row";

const SCHEMA = "iam";
const TABLE = "role_permissions";
const COLUMNS = "id, partner_id, role_id, permission_id, effect, created_at, updated_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

/** `iam.role_permissions` Repository Pattern implementation. No `remove` method: see `detachRolePermission`. */
export class SupabaseRolePermissionRepository implements RolePermissionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listByRole(partnerId: string, roleId: string): Promise<readonly RolePermission[]> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("partner_id", partnerId)
      .eq("role_id", roleId)
      .order("id", { ascending: true });
    assertNoError(error, "Failed to list role permissions");
    return ((data ?? []) as readonly unknown[]).map((row) =>
      toRolePermission(rolePermissionRowSchema.parse(row)),
    );
  }

  async findByRoleAndPermission(
    partnerId: string,
    roleId: string,
    permissionId: string,
  ): Promise<RolePermission | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .select(COLUMNS)
      .eq("partner_id", partnerId)
      .eq("role_id", roleId)
      .eq("permission_id", permissionId)
      .maybeSingle();
    assertNoError(error, "Failed to load role permission");
    return data ? toRolePermission(rolePermissionRowSchema.parse(data)) : null;
  }

  async create(input: NewRolePermissionRecord): Promise<RolePermission> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(TABLE)
      .insert({
        partner_id: input.partnerId,
        role_id: input.roleId,
        permission_id: input.permissionId,
        effect: input.effect,
      })
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create role permission");
    return toRolePermission(rolePermissionRowSchema.parse(data));
  }
}
