import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { AssetRepository } from "../ports/asset-repository";
import { createAsset } from "./create-asset";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
const assetTypeId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";
const businessObjectId = "2b3c4d5e-6f78-4901-90ab-cdef01234568";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const validInput = {
  assetTypeId,
  businessObjectId,
  displayRef: "Toyota Camry - ABC-1234",
  currentStatusCode: "active",
};

function fakeRepository(overrides: Partial<AssetRepository> = {}): AssetRepository {
  return {
    list: async () => [],
    findById: async () => null,
    assetTypeExists: async () => true,
    create: async (input) => ({
      id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
      partnerId: input.partnerId,
      assetTypeId: input.assetTypeId,
      businessObjectId: input.businessObjectId,
      displayRef: input.displayRef,
      currentStatusCode: input.currentStatusCode,
      currentOwnerCustomerId: input.currentOwnerCustomerId ?? null,
      versionNo: 1,
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    }),
    update: async () => ({ ok: false, category: "DATABASE_ERROR", rowsAffected: 0 }),
    changeStatus: async () => null,
    ...overrides,
  };
}

describe("createAsset", () => {
  it("creates the asset when the asset type exists in the resolved partner", async () => {
    const created = await createAsset(
      validInput,
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
      },
    );
    expect(created.partnerId).toBe(activePartnerId);
    expect(created.versionNo).toBe(1);
  });

  it("rejects an unknown assetTypeId with 422 instead of a raw FK violation", async () => {
    const auditSink = new RecordingAuditSink();
    await expect(
      createAsset(
        validInput,
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ assetTypeExists: async () => false }),
          auditSink,
        },
      ),
    ).rejects.toMatchObject({ code: "validation_failed", status: 422 });
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "asset.create",
        outcome: "denied",
        reason: "asset_type_not_found",
      }),
    ]);
  });
});
