import type {
  ActiveMembership,
  ClaimSource,
  EffectiveRole,
  IamUser,
  RolePermission,
} from "./resolver.ts";

interface PostgrestResult {
  readonly data: unknown;
  readonly error: { readonly message?: string; readonly code?: string } | null;
}

interface QueryBuilder extends PromiseLike<PostgrestResult> {
  select(columns: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  is(column: string, value: null): QueryBuilder;
  or(filters: string): QueryBuilder;
  limit(count: number): QueryBuilder;
  maybeSingle(): QueryBuilder;
}

export interface SupabaseClientLike {
  schema(name: string): { from(table: string): QueryBuilder };
}

export type IamFailureClass = "schema_not_exposed" | "permission_denied" | "upstream_error";

export class IamSourceError extends Error {
  constructor(readonly failureClass: IamFailureClass) {
    super("iam_source_unavailable");
    this.name = "IamSourceError";
  }
}

function classifyPostgrestError(error: {
  readonly message?: string;
  readonly code?: string;
}): IamSourceError {
  const normalized = (error.message ?? "").toLowerCase();
  if (
    error.code === "PGRST106" ||
    normalized.includes("schema must be one of") ||
    normalized.includes("schema not exposed")
  ) {
    return new IamSourceError("schema_not_exposed");
  }
  if (normalized.includes("permission denied") || normalized.includes("insufficient privilege")) {
    return new IamSourceError("permission_denied");
  }
  return new IamSourceError("upstream_error");
}

function rows(result: PostgrestResult): readonly Record<string, unknown>[] {
  if (result.error) throw classifyPostgrestError(result.error);
  if (result.data === null) return [];
  if (!Array.isArray(result.data)) throw new Error("iam_source_invalid_response");
  return result.data as readonly Record<string, unknown>[];
}

function oneOrNull(result: PostgrestResult): Record<string, unknown> | null {
  if (result.error) throw classifyPostgrestError(result.error);
  if (result.data === null) return null;
  if (typeof result.data !== "object" || Array.isArray(result.data)) {
    throw new Error("iam_source_invalid_response");
  }
  return result.data as Record<string, unknown>;
}

function asString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("iam_source_invalid_response");
  }
  return value;
}

function idFilter(ids: readonly string[]): string {
  return ids.map((id) => `id.eq.${id}`).join(",");
}

export class SupabaseClaimSource implements ClaimSource {
  constructor(private readonly client: SupabaseClientLike) {}

  async findUserByAuthSubject(authSubject: string): Promise<IamUser | null> {
    const result = await this.client
      .schema("iam")
      .from("users")
      .select("id,status")
      .eq("auth_subject", authSubject)
      .limit(1)
      .maybeSingle();
    const row = oneOrNull(result);
    return row ? { id: asString(row, "id"), status: asString(row, "status") } : null;
  }

  async listActiveMemberships(userId: string): Promise<readonly ActiveMembership[]> {
    const result = await this.client
      .schema("iam")
      .from("memberships")
      .select("id,partner_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .is("deleted_at", null);
    return rows(result).map((row) => ({
      id: asString(row, "id"),
      partnerId: asString(row, "partner_id"),
    }));
  }

  async listEffectiveRoles(
    partnerId: string,
    membershipId: string,
    issuedAt: Date,
  ): Promise<readonly EffectiveRole[]> {
    const assignmentResult = await this.client
      .schema("iam")
      .from("membership_roles")
      .select("role_id,valid_from,valid_to")
      .eq("partner_id", partnerId)
      .eq("membership_id", membershipId);
    const instant = issuedAt.getTime();
    const roleIds = rows(assignmentResult)
      .filter((row) => {
        const from = Date.parse(asString(row, "valid_from"));
        const rawTo = row.valid_to;
        const to =
          rawTo === null ? Number.POSITIVE_INFINITY : Date.parse(asString(row, "valid_to"));
        return Number.isFinite(from) && from <= instant && to > instant;
      })
      .map((row) => asString(row, "role_id"));
    if (roleIds.length === 0) return [];

    const roleResult = await this.client
      .schema("iam")
      .from("roles")
      .select("id,code")
      .eq("partner_id", partnerId)
      .eq("status", "active")
      .is("deleted_at", null)
      .or(idFilter(roleIds));
    return rows(roleResult).map((row) => ({
      id: asString(row, "id"),
      code: asString(row, "code"),
    }));
  }

  async listRolePermissions(
    partnerId: string,
    roleIds: readonly string[],
  ): Promise<readonly RolePermission[]> {
    if (roleIds.length === 0) return [];
    const rolePermissionResult = await this.client
      .schema("iam")
      .from("role_permissions")
      .select("role_id,permission_id,effect")
      .eq("partner_id", partnerId)
      .or(roleIds.map((id) => `role_id.eq.${id}`).join(","));
    const rolePermissions = rows(rolePermissionResult);
    if (rolePermissions.length === 0) return [];

    const permissionIds = [
      ...new Set(rolePermissions.map((row) => asString(row, "permission_id"))),
    ];
    const permissionResult = await this.client
      .schema("iam")
      .from("permissions")
      .select("id,code")
      .or(idFilter(permissionIds));
    const codeById = new Map(
      rows(permissionResult).map((row) => [asString(row, "id"), asString(row, "code")]),
    );

    return rolePermissions.map((row) => {
      const permissionId = asString(row, "permission_id");
      const code = codeById.get(permissionId);
      if (!code) throw new Error("iam_source_invalid_response");
      return { permissionId, code, effect: asString(row, "effect") };
    });
  }
}
