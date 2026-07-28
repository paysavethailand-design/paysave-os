import type { Role } from "../../domain/entities/role";
import type { CreateRoleInput, UpdateRoleInput } from "../dto/role-schemas";

export interface ListRolesParams {
  readonly partnerId: string;
  readonly limit: number;
  readonly cursor: string | null;
}

export interface NewRoleRecord extends CreateRoleInput {
  readonly partnerId: string;
}

export interface DeleteRoleFields {
  readonly deletedAt: string;
  readonly deletedBy: string;
  readonly deleteReason: string;
}

/**
 * Repository Pattern port for `iam.roles`. Reads/mutations of an existing role key off `id` alone
 * (the primary key) and rely on RLS (`admin.authorized_partner`) to filter visibility; Application
 * then re-derives `partnerId` from the loaded row to make an explicit tenant-scope decision before
 * writing (see `resolveWritePartnerId`). `list`/`create` need the target partner up front instead.
 */
export interface RoleRepository {
  list(params: ListRolesParams): Promise<readonly Role[]>;
  findById(roleId: string): Promise<Role | null>;
  findByCode(partnerId: string, code: string): Promise<Role | null>;
  create(input: NewRoleRecord): Promise<Role>;
  update(roleId: string, input: UpdateRoleInput): Promise<Role | null>;
  /** Soft-deletes via `deleted_at`/`deleted_by`/`delete_reason`; RLS has no DELETE policy for this table. */
  softDelete(roleId: string, fields: DeleteRoleFields): Promise<Role | null>;
}
