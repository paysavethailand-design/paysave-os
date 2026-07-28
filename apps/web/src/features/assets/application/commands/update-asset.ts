import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import { updateAssetSchema } from "../dto/asset-schemas";
import type { AssetRepository } from "../ports/asset-repository";
import type { RequestContext } from "../ports/request-context";

export interface UpdateAssetDeps {
  readonly repository: AssetRepository;
  readonly auditSink: AuditSink;
}

/** Updates an asset's display reference and/or current owner customer. */
export async function updateAsset(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: UpdateAssetDeps,
): Promise<Asset> {
  const input = updateAssetSchema.parse(rawInput);

  const existing = await deps.repository.findById(assetId);
  if (!existing) {
    throw new ApiError("not_found", `Asset not found: ${assetId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  const updated = await deps.repository.update(assetId, input);
  if (!updated) {
    throw new ApiError("not_found", `Asset not found: ${assetId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "asset.update",
    resourceType: "asset.assets",
    resourceId: assetId,
    outcome: "success",
  });

  return updated;
}
