import { describe, expect, it } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";
import { getAsset } from "./get-asset";

const existing: Asset = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa4444",
  partnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
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
    update: async () => existing,
    changeStatus: async () => existing,
    ...overrides,
  };
}

describe("getAsset", () => {
  it("returns the asset when found", async () => {
    await expect(getAsset(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws 404 when not found", async () => {
    await expect(
      getAsset("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
