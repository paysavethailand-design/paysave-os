"use server";

import { reportUnhandledRouteError } from "@paysave/observability";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requirePermission } from "@/features/auth/server";
import { ASSETS_PERMISSIONS, updateAssetUseCase, type Asset } from "@/features/assets/server";

const saveInventoryAssetInputSchema = z.object({
  assetId: z.uuid(),
  displayRef: z.string().trim().min(1).max(2000),
});

export type InventorySaveResult =
  | {
      readonly ok: true;
      readonly asset: Asset;
      readonly message: string;
      readonly correlationId: string;
    }
  | {
      readonly ok: false;
      readonly message: string;
      readonly correlationId: string;
    };

/**
 * Persists one Inventory reference through the server boundary. The authenticated actor and tenant
 * scope are resolved server-side; no permission or tenant identifier is accepted from the client.
 */
export async function saveInventoryAssetAction(rawInput: {
  readonly assetId: string;
  readonly displayRef: string;
}): Promise<InventorySaveResult> {
  const actor = await requirePermission(ASSETS_PERMISSIONS.MANAGE, "/inventory");
  const correlationId = randomUUID();
  const parsed = saveInventoryAssetInputSchema.safeParse(rawInput);

  if (!parsed.success) {
    return {
      ok: false,
      message: "ข้อมูล Inventory ไม่ถูกต้อง",
      correlationId,
    };
  }

  try {
    const asset = await updateAssetUseCase(
      parsed.data.assetId,
      { displayRef: parsed.data.displayRef },
      { actor, correlationId },
    );
    return {
      ok: true,
      asset,
      message: "บันทึก Inventory เรียบร้อย",
      correlationId,
    };
  } catch (error) {
    reportUnhandledRouteError({
      correlationId,
      method: "POST",
      path: "/inventory#save",
      status: 500,
      code: "inventory_save_failed",
      error,
    });
    return {
      ok: false,
      message: "ไม่สามารถบันทึก Inventory ได้",
      correlationId,
    };
  }
}
