import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository, AssetStatusTransition } from "../ports/asset-repository";
import { retireAsset } from "./retire-asset";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["assets.manage"],
  tenantScope: "active",
  sessionVersion: 1,
};

const existing: Asset = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partnerId: activePartnerId,
  assetTypeId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  businessObjectId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
  displayRef: "Toyota Camry - ABC-1234",
  currentStatusCode: "active",
  currentOwnerCustomerId: null,
  versionNo: 1,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function fakeRepository(overrides: Partial<AssetRepository> = {}): AssetRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    assetTypeExists: async () => true,
    create: async () => existing,
    update: async () => ({ ok: true, asset: existing, rowsAffected: 1 }),
    changeStatus: async (id, transition: AssetStatusTransition) => ({
      ...existing,
      id,
      currentStatusCode: transition.toStatusCode,
      versionNo: transition.previousVersionNo + 1,
    }),
    ...overrides,
  };
}

describe("retireAsset", () => {
  it("transitions the asset to the retired status code", async () => {
    const retired = await retireAsset(
      existing.id,
      { reasonCode: "written_off" },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink: new RecordingAuditSink(),
        clock: { now: () => new Date("2026-07-22T00:00:00.000Z") },
      },
    );
    expect(retired.currentStatusCode).toBe("retired");
  });

  it("requires a reasonCode", async () => {
    await expect(
      retireAsset(
        existing.id,
        {},
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository(),
          auditSink: new RecordingAuditSink(),
          clock: { now: () => new Date("2026-07-22T00:00:00.000Z") },
        },
      ),
    ).rejects.toThrow();
  });
});
