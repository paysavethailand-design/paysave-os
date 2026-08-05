"use server";

import { z } from "zod";
import { ASSETS_PERMISSIONS, updateAssetUseCase } from "@/features/assets/server";
import { requirePermission } from "@/features/auth/server";
import { ApiError } from "@/shared/lib/api-error";
import type { InventorySaveResult } from "@/features/assets";

const inventorySaveSchema = z.object({
  assetId: z.uuid(),
  displayRef: z.string().trim().min(1).max(2000),
  expectedVersionNo: z.number().int().positive(),
});

type InventorySaveFailureCategory =
  | "RLS_OR_PRIVILEGE"
  | "VERSION_CONFLICT"
  | "CONSTRAINT_VIOLATION"
  | "NOT_FOUND_OR_WRONG_TENANT"
  | "DATABASE_ERROR";

const SAFE_CATEGORIES = new Set<InventorySaveFailureCategory>([
  "RLS_OR_PRIVILEGE",
  "VERSION_CONFLICT",
  "CONSTRAINT_VIOLATION",
  "NOT_FOUND_OR_WRONG_TENANT",
  "DATABASE_ERROR",
]);

interface SafeDiagnostic {
  readonly category: InventorySaveFailureCategory;
  readonly rowsAffected: number;
}

function classifyFailure(error: unknown): SafeDiagnostic {
  if (error && typeof error === "object") {
    const candidate = error as { readonly category?: unknown; readonly rowsAffected?: unknown };
    if (
      typeof candidate.category === "string" &&
      SAFE_CATEGORIES.has(candidate.category as InventorySaveFailureCategory) &&
      typeof candidate.rowsAffected === "number" &&
      Number.isInteger(candidate.rowsAffected) &&
      candidate.rowsAffected >= 0
    ) {
      return {
        category: candidate.category as InventorySaveFailureCategory,
        rowsAffected: candidate.rowsAffected,
      };
    }
  }

  if (error instanceof ApiError) {
    if (error.code === "conflict") {
      return { category: "VERSION_CONFLICT", rowsAffected: 0 };
    }
    if (error.code === "forbidden" || error.code === "not_found") {
      return { category: "NOT_FOUND_OR_WRONG_TENANT", rowsAffected: 0 };
    }
    if (error.code === "validation_failed") {
      return { category: "CONSTRAINT_VIOLATION", rowsAffected: 0 };
    }
  }

  return { category: "DATABASE_ERROR", rowsAffected: 0 };
}

function reportInventorySaveFailure(correlationId: string, diagnostic: SafeDiagnostic): void {
  console.error(
    JSON.stringify({
      type: "inventory_save_failure",
      correlationId,
      category: diagnostic.category,
      rowsAffected: diagnostic.rowsAffected,
    }),
  );
}

/** Authenticated Inventory edit boundary. Tenant scope is derived exclusively from the actor. */
export async function saveInventoryAssetAction(input: {
  readonly assetId: string;
  readonly displayRef: string;
  readonly expectedVersionNo: number;
}): Promise<InventorySaveResult> {
  const actor = await requirePermission(ASSETS_PERMISSIONS.MANAGE, "/inventory");
  const correlationId = crypto.randomUUID();
  const parsed = inventorySaveSchema.safeParse(input);
  if (!parsed.success) {
    reportInventorySaveFailure(correlationId, {
      category: "CONSTRAINT_VIOLATION",
      rowsAffected: 0,
    });
    return {
      ok: false,
      message: "ข้อมูล Inventory ไม่ถูกต้อง",
      correlationId,
    };
  }

  try {
    const updated = await updateAssetUseCase(
      parsed.data.assetId,
      {
        displayRef: parsed.data.displayRef,
        expectedVersionNo: parsed.data.expectedVersionNo,
      },
      { actor, correlationId },
    );
    if (updated.rowsAffected !== 1) {
      reportInventorySaveFailure(correlationId, {
        category: "DATABASE_ERROR",
        rowsAffected: updated.rowsAffected,
      });
      return {
        ok: false,
        message: "ไม่สามารถบันทึก Inventory ได้",
        correlationId,
      };
    }
    return {
      ok: true,
      asset: updated.asset,
      message: "บันทึก Inventory เรียบร้อย",
      correlationId,
    };
  } catch (error) {
    reportInventorySaveFailure(correlationId, classifyFailure(error));
    return {
      ok: false,
      message: "ไม่สามารถบันทึก Inventory ได้",
      correlationId,
    };
  }
}
