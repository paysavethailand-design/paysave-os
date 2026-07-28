import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import { createAssetSchema } from "../dto/asset-schemas";
import type { AssetRepository } from "../ports/asset-repository";
import type { RequestContext } from "../ports/request-context";

export interface CreateAssetDeps {
  readonly repository: AssetRepository;
  readonly auditSink: AuditSink;
}

/** Creates a tenant-scoped asset. `assetTypeId` must reference an existing `asset.asset_types` row in the same partner. */
export async function createAsset(
  rawInput: unknown,
  context: RequestContext,
  deps: CreateAssetDeps,
): Promise<Asset> {
  const input = createAssetSchema.parse(rawInput);

  const scope = resolveWritePartnerId(context.actor, input.partnerId ?? null);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const assetTypeExists = await deps.repository.assetTypeExists(scope.partnerId, input.assetTypeId);
  if (!assetTypeExists) {
    await deps.auditSink.record({
      correlationId: context.correlationId,
      actorType: "user",
      actorUserId: context.actor.userId,
      partnerId: scope.partnerId,
      action: "asset.create",
      resourceType: "asset.assets",
      resourceId: null,
      outcome: "denied",
      reason: "asset_type_not_found",
    });
    throw new ApiError(
      "validation_failed",
      "assetTypeId does not reference an existing asset type",
      [{ path: "assetTypeId", message: "must reference an existing asset type in this partner" }],
    );
  }

  const created = await deps.repository.create({ ...input, partnerId: scope.partnerId });
  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "asset.create",
    resourceType: "asset.assets",
    resourceId: created.id,
    outcome: "success",
  });

  return created;
}
