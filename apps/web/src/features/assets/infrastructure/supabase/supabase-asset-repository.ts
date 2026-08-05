import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/shared/lib/api-error";
import type { UpdateAssetInput } from "../../application/dto/asset-schemas";
import type {
  AssetRepository,
  AssetStatusTransition,
  AssetUpdateFailureCategory,
  AssetUpdateResult,
  ListAssetsParams,
  NewAssetRecord,
} from "../../application/ports/asset-repository";
import type { Asset } from "../../domain/entities/asset";
import { assetRowSchema, toAsset } from "./asset-row";

const SCHEMA = "asset";
const ASSETS_TABLE = "assets";
const ASSET_TYPES_TABLE = "asset_types";
const COLUMNS =
  "id, partner_id, asset_type_id, business_object_id, display_ref, current_status_code, current_owner_customer_id, version_no, created_at, updated_at";

function assertNoError(error: { readonly message: string } | null, context: string): void {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

interface SafeDatabaseError {
  readonly code?: string;
}

function classifyDatabaseError(error: SafeDatabaseError): AssetUpdateFailureCategory {
  if (
    error.code === "42501" ||
    error.code === "PGRST301" ||
    error.code === "PGRST302" ||
    error.code === "PT403"
  ) {
    return "RLS_OR_PRIVILEGE";
  }
  if (error.code === "PT404") {
    return "NOT_FOUND_OR_WRONG_TENANT";
  }
  if (error.code === "PT409") {
    return "VERSION_CONFLICT";
  }
  if (error.code?.startsWith("23")) {
    return "CONSTRAINT_VIOLATION";
  }
  return "DATABASE_ERROR";
}

/**
 * `asset.assets` Repository Pattern implementation using the request-scoped, RLS-bound Supabase
 * client. `changeStatus` issues two sequential statements (insert history, then update the asset);
 * see the port doc comment for the consistency caveat this implies.
 */
export class SupabaseAssetRepository implements AssetRepository {
  constructor(private readonly client: SupabaseClient) {}

  async list(params: ListAssetsParams): Promise<readonly Asset[]> {
    let query = this.client
      .schema(SCHEMA)
      .from(ASSETS_TABLE)
      .select(COLUMNS)
      .eq("partner_id", params.partnerId)
      .order("id", { ascending: true })
      .limit(params.limit + 1);

    if (params.cursor) {
      query = query.gt("id", params.cursor);
    }

    const { data, error } = await query;
    assertNoError(error, "Failed to list assets");
    return ((data ?? []) as readonly unknown[]).map((row) => toAsset(assetRowSchema.parse(row)));
  }

  async findById(assetId: string): Promise<Asset | null> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(ASSETS_TABLE)
      .select(COLUMNS)
      .eq("id", assetId)
      .maybeSingle();
    assertNoError(error, "Failed to load asset");
    return data ? toAsset(assetRowSchema.parse(data)) : null;
  }

  async assetTypeExists(partnerId: string, assetTypeId: string): Promise<boolean> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(ASSET_TYPES_TABLE)
      .select("id")
      .eq("partner_id", partnerId)
      .eq("id", assetTypeId)
      .maybeSingle();
    assertNoError(error, "Failed to check asset type");
    return data !== null;
  }

  async create(input: NewAssetRecord): Promise<Asset> {
    const { data, error } = await this.client
      .schema(SCHEMA)
      .from(ASSETS_TABLE)
      .insert({
        partner_id: input.partnerId,
        asset_type_id: input.assetTypeId,
        business_object_id: input.businessObjectId,
        display_ref: input.displayRef,
        current_status_code: input.currentStatusCode,
        current_owner_customer_id: input.currentOwnerCustomerId ?? null,
      })
      .select(COLUMNS)
      .single();
    assertNoError(error, "Failed to create asset");
    return toAsset(assetRowSchema.parse(data));
  }

  async update(
    assetId: string,
    partnerId: string,
    input: UpdateAssetInput,
  ): Promise<AssetUpdateResult> {
    const { data, error } = await this.client.schema(SCHEMA).rpc("update_asset_inventory_fields", {
      p_asset_id: assetId,
      p_partner_id: partnerId,
      p_expected_version_no: input.expectedVersionNo,
      p_display_ref: input.displayRef ?? null,
      p_set_current_owner: input.currentOwnerCustomerId !== undefined,
      p_current_owner_customer_id: input.currentOwnerCustomerId ?? null,
    });

    if (error) {
      return { ok: false, category: classifyDatabaseError(error), rowsAffected: 0 };
    }

    const rows = Array.isArray(data) ? data : [];
    if (rows.length !== 1) {
      return { ok: false, category: "DATABASE_ERROR", rowsAffected: 0 };
    }

    return {
      ok: true,
      asset: toAsset(assetRowSchema.parse(rows[0])),
      rowsAffected: 1,
    };
  }

  async changeStatus(assetId: string, transition: AssetStatusTransition): Promise<Asset | null> {
    const { data, error } = await this.client.schema(SCHEMA).rpc("transition_asset_status", {
      p_asset_id: assetId,
      p_partner_id: transition.partnerId,
      p_expected_version_no: transition.previousVersionNo,
      p_to_status_code: transition.toStatusCode,
      p_reason_code: transition.reasonCode,
      p_changed_at: transition.changedAt,
      p_changed_by: transition.changedBy,
      p_correlation_id: transition.correlationId,
    });
    if (error?.code === "PT409") {
      throw new ApiError("conflict", "Asset was modified by another request");
    }
    if (error?.code === "PT404") {
      return null;
    }
    assertNoError(error, "Failed to transition asset status atomically");
    const first = Array.isArray(data) ? data[0] : data;
    return first ? toAsset(assetRowSchema.parse(first)) : null;
  }
}
