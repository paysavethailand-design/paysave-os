import type { AuthContext } from "@paysave/security";
import { describe, expect, it, vi } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";
import { listAssets } from "./list-assets";

const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId,
  roles: ["admin"],
  permissions: ["assets.read"],
  tenantScope: "active",
  sessionVersion: 1,
};

function asset(id: string): Asset {
  return {
    id,
    partnerId: activePartnerId,
    assetTypeId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
    businessObjectId: "2b3c4d5e-6f78-4901-90ab-cdef01234568",
    displayRef: `Asset ${id}`,
    currentStatusCode: "active",
    currentOwnerCustomerId: null,
    versionNo: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

describe("listAssets", () => {
  it("scopes the query to the caller's active partner", async () => {
    const list = vi.fn().mockResolvedValue([asset("1")]);
    const repository: AssetRepository = {
      list,
      findById: async () => null,
      assetTypeExists: async () => true,
      create: async () => asset("1"),
      update: async () => null,
      changeStatus: async () => null,
    };

    await listAssets({ limit: 20, cursor: null }, null, actor, repository);
    expect(list).toHaveBeenCalledWith({ partnerId: activePartnerId, limit: 20, cursor: null });
  });
});
