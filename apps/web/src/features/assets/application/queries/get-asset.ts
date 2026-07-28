import { ApiError } from "@/shared/lib/api-error";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";

/** Returns a single asset or throws a 404 ApiError. RLS already restricts visibility. */
export async function getAsset(assetId: string, repository: AssetRepository): Promise<Asset> {
  const asset = await repository.findById(assetId);
  if (!asset) {
    throw new ApiError("not_found", `Asset not found: ${assetId}`);
  }
  return asset;
}
