import type { AuthContext } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  roles: ["admin"],
  permissions: ["assets.read", "assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const requirePermission = vi.fn().mockResolvedValue(actor);
const updateAssetUseCase = vi.fn();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

vi.mock("@/features/auth/server", () => ({
  requirePermission: (permission: string, returnTo: string) =>
    requirePermission(permission, returnTo),
}));

vi.mock("@/features/assets/server", () => ({
  ASSETS_PERMISSIONS: { MANAGE: "assets.manage" },
  updateAssetUseCase: (assetId: string, input: unknown, context: unknown) =>
    updateAssetUseCase(assetId, input, context),
}));

const { saveInventoryAssetAction } = await import("./actions");

const assetId = "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444";
const updated = {
  id: assetId,
  partnerId: actor.activePartnerId,
  assetTypeId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  businessObjectId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
  displayRef: "INV-001-TEST",
  currentStatusCode: "active",
  currentOwnerCustomerId: null,
  versionNo: 2,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
};

function validInput() {
  return { assetId, displayRef: "INV-001-TEST", expectedVersionNo: 1 };
}

beforeEach(() => {
  requirePermission.mockReset().mockResolvedValue(actor);
  updateAssetUseCase.mockReset().mockResolvedValue({ asset: updated, rowsAffected: 1 });
  consoleError.mockClear();
});

describe("saveInventoryAssetAction", () => {
  it("requires assets.manage and returns the database-confirmed updated asset", async () => {
    const result = await saveInventoryAssetAction({
      ...validInput(),
      displayRef: " INV-001-TEST ",
    });

    expect(requirePermission).toHaveBeenCalledWith("assets.manage", "/inventory");
    expect(updateAssetUseCase).toHaveBeenCalledWith(
      assetId,
      { displayRef: "INV-001-TEST", expectedVersionNo: 1 },
      expect.objectContaining({ actor, correlationId: expect.any(String) }),
    );
    expect(result).toMatchObject({
      ok: true,
      asset: updated,
      message: "บันทึก Inventory เรียบร้อย",
      correlationId: expect.any(String),
    });
    expect(consoleError).not.toHaveBeenCalled();
  });

  it("returns validation feedback and logs only a safe category and row count", async () => {
    const result = await saveInventoryAssetAction({ ...validInput(), displayRef: "   " });

    expect(updateAssetUseCase).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ok: false,
      message: "ข้อมูล Inventory ไม่ถูกต้อง",
      correlationId: expect.any(String),
    });
    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toMatchObject({
      type: "inventory_save_failure",
      category: "CONSTRAINT_VIOLATION",
      rowsAffected: 0,
      correlationId: result.correlationId,
    });
  });

  it("sanitizes tenant and asset identifiers from Server Action failures", async () => {
    const outsidePartnerId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";
    updateAssetUseCase.mockRejectedValue(
      new ApiError("forbidden", `Cannot act on partner ${outsidePartnerId}: partner_mismatch`),
    );

    const result = await saveInventoryAssetAction(validInput());

    expect(result).toMatchObject({
      ok: false,
      message: "ไม่สามารถบันทึก Inventory ได้",
      correlationId: expect.any(String),
    });
    expect(result.message).not.toContain(assetId);
    expect(result.message).not.toContain(outsidePartnerId);
    const diagnostic = String(consoleError.mock.calls[0]?.[0]);
    expect(diagnostic).not.toContain(assetId);
    expect(diagnostic).not.toContain(outsidePartnerId);
    expect(diagnostic).not.toContain("partner_mismatch");
    expect(JSON.parse(diagnostic)).toMatchObject({
      category: "NOT_FOUND_OR_WRONG_TENANT",
      rowsAffected: 0,
    });
  });

  it("returns safe database failure feedback and never reports false success", async () => {
    updateAssetUseCase.mockRejectedValue(new ApiError("internal_error", "Unexpected server error"));

    const result = await saveInventoryAssetAction(validInput());

    expect(result).toMatchObject({
      ok: false,
      message: "ไม่สามารถบันทึก Inventory ได้",
      correlationId: expect.any(String),
    });
    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toMatchObject({
      category: "DATABASE_ERROR",
      rowsAffected: 0,
    });
  });

  it("logs only a safe category and row count for a version conflict", async () => {
    const error = Object.assign(new Error("stale data for secret asset"), {
      name: "AssetUpdateFailureError",
      category: "VERSION_CONFLICT",
      rowsAffected: 0,
    });
    updateAssetUseCase.mockRejectedValue(error);

    const result = await saveInventoryAssetAction(validInput());

    expect(result.ok).toBe(false);
    const diagnostic = String(consoleError.mock.calls[0]?.[0]);
    expect(diagnostic).not.toContain("stale data");
    expect(diagnostic).not.toContain(assetId);
    expect(JSON.parse(diagnostic)).toMatchObject({
      type: "inventory_save_failure",
      category: "VERSION_CONFLICT",
      rowsAffected: 0,
      correlationId: result.correlationId,
    });
  });

  it("preserves an explicit RLS category carried by a standardized API error", async () => {
    updateAssetUseCase.mockRejectedValue(
      Object.assign(new ApiError("forbidden", "safe"), {
        category: "RLS_OR_PRIVILEGE",
        rowsAffected: 0,
      }),
    );

    await saveInventoryAssetAction(validInput());

    expect(JSON.parse(String(consoleError.mock.calls[0]?.[0]))).toMatchObject({
      category: "RLS_OR_PRIVILEGE",
      rowsAffected: 0,
    });
  });
});
