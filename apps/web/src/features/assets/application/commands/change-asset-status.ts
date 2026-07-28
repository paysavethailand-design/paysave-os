import type { AuditSink } from "@paysave/observability";
import { resolveWritePartnerId } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import { assertInventoryTransitionAllowed } from "../../domain/inventory-lifecycle";
import { changeAssetStatusSchema } from "../dto/asset-schemas";
import type { AssetRepository } from "../ports/asset-repository";
import type { Clock } from "../ports/clock";
import type { RequestContext } from "../ports/request-context";

export interface ChangeAssetStatusDeps {
  readonly repository: AssetRepository;
  readonly auditSink: AuditSink;
  readonly clock: Clock;
}

/**
 * Transitions an asset's `current_status_code` and appends an immutable
 * `asset.asset_status_history` row. This is the only supported lifecycle "delete" analog for
 * assets — see `retireAsset`.
 */
export async function changeAssetStatus(
  assetId: string,
  rawInput: unknown,
  context: RequestContext,
  deps: ChangeAssetStatusDeps,
): Promise<Asset> {
  const input = changeAssetStatusSchema.parse(rawInput);

  const existing = await deps.repository.findById(assetId);
  if (!existing) {
    throw new ApiError("not_found", `Asset not found: ${assetId}`);
  }

  const scope = resolveWritePartnerId(context.actor, existing.partnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot act on partner ${existing.partnerId}: ${scope.reason}`);
  }

  if (existing.currentStatusCode === input.toStatusCode) {
    throw new ApiError("conflict", `Asset is already in status: ${input.toStatusCode}`);
  }

  try {
    assertInventoryTransitionAllowed(existing.currentStatusCode, input.toStatusCode);
  } catch (error) {
    throw new ApiError(
      "conflict",
      error instanceof Error ? error.message : "Invalid inventory lifecycle transition",
    );
  }

  const updated = await deps.repository.changeStatus(assetId, {
    partnerId: scope.partnerId,
    fromStatusCode: existing.currentStatusCode,
    toStatusCode: input.toStatusCode,
    reasonCode: input.reasonCode,
    changedAt: deps.clock.now().toISOString(),
    changedBy: context.actor.userId,
    previousVersionNo: existing.versionNo,
    correlationId: context.correlationId,
  });
  if (!updated) {
    throw new ApiError("not_found", `Asset not found: ${assetId}`);
  }

  await deps.auditSink.record({
    correlationId: context.correlationId,
    actorType: "user",
    actorUserId: context.actor.userId,
    partnerId: scope.partnerId,
    action: "asset.status.change",
    resourceType: "asset.assets",
    resourceId: assetId,
    outcome: "success",
    reason: input.reasonCode,
    metadata: { fromStatusCode: existing.currentStatusCode, toStatusCode: input.toStatusCode },
  });

  return updated;
}
