import type { Asset } from "../../domain/entities/asset";
import type { CreateAssetInput, UpdateAssetInput } from "../dto/asset-schemas";

export interface ListAssetsParams {
  readonly partnerId: string;
  readonly limit: number;
  readonly cursor: string | null;
}

export interface NewAssetRecord extends CreateAssetInput {
  readonly partnerId: string;
}

export type AssetUpdateFailureCategory =
  | "RLS_OR_PRIVILEGE"
  | "VERSION_CONFLICT"
  | "CONSTRAINT_VIOLATION"
  | "NOT_FOUND_OR_WRONG_TENANT"
  | "DATABASE_ERROR";

export type AssetUpdateResult =
  | { readonly ok: true; readonly asset: Asset; readonly rowsAffected: 1 }
  | {
      readonly ok: false;
      readonly category: AssetUpdateFailureCategory;
      readonly rowsAffected: number;
    };

export interface AssetStatusTransition {
  readonly partnerId: string;
  readonly fromStatusCode: string;
  readonly toStatusCode: string;
  readonly reasonCode: string;
  readonly changedAt: string;
  readonly changedBy: string;
  /** The asset's `version_no` at read time, so the repository can advance it without a second read. */
  readonly previousVersionNo: number;
  /** Correlates the atomic transition with its persistent before/after audit event. */
  readonly correlationId: string;
}

/**
 * Repository Pattern port for `asset.assets`. There is no `deleted_at` column and no DELETE RLS
 * policy, so lifecycle retirement is a status transition (`changeStatus`), not a delete. History is
 * appended to `asset.asset_status_history`, which a DB trigger makes append-only (blocks UPDATE/DELETE
 * even though an UPDATE RLS policy nominally exists) — this port has no method that could violate that.
 */
export interface AssetRepository {
  list(params: ListAssetsParams): Promise<readonly Asset[]>;
  findById(assetId: string): Promise<Asset | null>;
  /** Validates the FK target before insert so a bad `assetTypeId` surfaces as 422, not a raw DB error. */
  assetTypeExists(partnerId: string, assetTypeId: string): Promise<boolean>;
  create(input: NewAssetRecord): Promise<Asset>;
  update(assetId: string, partnerId: string, input: UpdateAssetInput): Promise<AssetUpdateResult>;
  /**
   * Appends an `asset_status_history` row and updates `assets.current_status_code`/`version_no`.
   * These are two sequential statements (PostgREST has no client-side multi-statement transaction),
   * so a crash between them can leave history and current status briefly inconsistent — see the
   * Sprint Report for the follow-up (wrap in a DB function/RPC).
   */
  changeStatus(assetId: string, transition: AssetStatusTransition): Promise<Asset | null>;
}
