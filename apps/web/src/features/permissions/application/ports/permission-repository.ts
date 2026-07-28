import type { Permission } from "../../domain/entities/permission";
import type { CreatePermissionInput, UpdatePermissionInput } from "../dto/permission-schemas";

export interface ListPermissionsParams {
  readonly limit: number;
  readonly cursor: string | null;
}

/** Repository Pattern port for `iam.permissions`; Infrastructure supplies the Supabase-backed implementation. */
export interface PermissionRepository {
  /** Returns up to `params.limit + 1` rows ordered ascending by `id` for keyset pagination. */
  list(params: ListPermissionsParams): Promise<readonly Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByCode(code: string): Promise<Permission | null>;
  create(input: CreatePermissionInput): Promise<Permission>;
  update(id: string, input: UpdatePermissionInput): Promise<Permission | null>;
}
