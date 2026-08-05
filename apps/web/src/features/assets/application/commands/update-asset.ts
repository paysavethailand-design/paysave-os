import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import { updateAssetSchema } from "../dto/asset-schemas";
import type { AssetRepository, AssetUpdateFailureCategory } from "../ports/asset-repository";
import type { RequestContext } from "../ports/request-context";

export interface AssetUpdateSuccess {
  readonly asset: Asset;
  readonly rowsAffected: 1;
}

function apiCodeForFailure(category: AssetUpdateFailureCategory) {
  switch (category) {
    case "RLS_OR_PRIVILEGE":
      return "forbidden" as const;
    case "VERSION_CONFLICT":
      return "conflict" as const;
    case "CONSTRAINT_VIOLATION":
      return "validation_failed" as const;
    case "NOT_FOUND_OR_WRONG_TENANT":
      return "not_found" as const;
    case "DATABASE_ERROR":
      return "internal_error" as const;
  }
}

export class AssetUpdateFailureError extends ApiError {
  readonly category: AssetUpdateFailureCategory;
  readonly rowsAffected: number;

  constructor(category: AssetUpdateFailureCategory, rowsAffected: number) {
    super(apiCodeForFailure(category), "Asset update failed");
    this.name = "AssetUpdateFailureError";
    this.category = category;
    this.rowsAffected = rowsAffected;
  }
}

interface Dependencies {
  readonly repository: AssetRepository;
  readonly auditSink: AuditSink;
}

export async function updateAsset(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
  dependencies: Dependencies,
): Promise<AssetUpdateSuccess> {
  const input = updateAssetSchema.parse(rawInput);
  const existing = await dependencies.repository.findById(assetId);
  if (!existing) {
    throw new ApiError("not_found", "Asset is not available in the authenticated tenant");
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", "Asset is not available in the authenticated tenant");
  }

  const result = await dependencies.repository.update(assetId, scope.partnerId, input);
  if (!result.ok) {
    throw new AssetUpdateFailureError(result.category, result.rowsAffected);
  }

  await dependencies.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: null,
    action: "asset.update",
    resourceType: "asset",
    resourceId: null,
    outcome: "success",
    metadata: { rowsAffected: result.rowsAffected },
  });

  return { asset: result.asset, rowsAffected: result.rowsAffected };
}
