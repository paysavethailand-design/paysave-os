import type { Partner } from "../../domain/entities/partner";
import type { CreatePartnerInput, UpdatePartnerInput } from "../dto/partner-schemas";

export interface ListPartnersParams {
  readonly limit: number;
  readonly cursor: string | null;
}

export interface DeletePartnerFields {
  readonly deletedAt: string;
  readonly deletedBy: string;
  readonly deleteReason: string;
}

/**
 * Repository Pattern port for `tenant.partners`. Unlike child resources, the partner's own `id` is
 * what RLS (`admin.authorized_partner(id)`) scopes on, so no separate `partnerId` filter column
 * exists here.
 */
export interface PartnerRepository {
  list(params: ListPartnersParams): Promise<readonly Partner[]>;
  findById(id: string): Promise<Partner | null>;
  findByCode(code: string): Promise<Partner | null>;
  create(input: CreatePartnerInput): Promise<Partner>;
  update(id: string, input: UpdatePartnerInput): Promise<Partner | null>;
  /** Soft-deletes via `deleted_at`/`deleted_by`/`delete_reason`; RLS has no DELETE policy for this table. */
  softDelete(id: string, fields: DeletePartnerFields): Promise<Partner | null>;
}
