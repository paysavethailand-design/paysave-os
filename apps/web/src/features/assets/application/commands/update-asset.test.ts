import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository } from "../ports/asset-repository";
import { updateAsset } from "./update-asset";

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
    update: async (id, _partnerId, input) => ({
      ok: true,
      rowsAffected: 1,
      asset: {
        ...existing,
        id,
        displayRef: input.displayRef ?? existing.displayRef,
        versionNo: input.expectedVersionNo + 1,
      },
    }),
    changeStatus: async () => null,
    ...overrides,
  };
}

describe("updateAsset", () => {
  it("updates the display reference without logging asset or tenant identifiers", async () => {
    const auditSink = new RecordingAuditSink();
    const updated = await updateAsset(
      existing.id,
      { displayRef: "New ref", expectedVersionNo: 1 },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository(),
        auditSink,
      },
    );
    expect(updated.asset.displayRef).toBe("New ref");
    expect(updated.rowsAffected).toBe(1);
    expect(auditSink.all()[0]).toMatchObject({
      partnerId: null,
      resourceId: null,
      metadata: { rowsAffected: 1 },
    });
  });

  it("passes the authenticated tenant and expected version to the repository", async () => {
    let captured: readonly unknown[] = [];
    await updateAsset(
      existing.id,
      { displayRef: "New ref", expectedVersionNo: 1 },
      { actor, correlationId: "c1" },
      {
        repository: fakeRepository({
          update: async (...args) => {
            captured = args;
            return {
              ok: true,
              rowsAffected: 1,
              asset: { ...existing, displayRef: "New ref", versionNo: 2 },
            };
          },
        }),
        auditSink: new RecordingAuditSink(),
      },
    );

    expect(captured).toEqual([
      existing.id,
      activePartnerId,
      { displayRef: "New ref", expectedVersionNo: 1 },
    ]);
  });

  it("404s when not found", async () => {
    await expect(
      updateAsset(
        "missing",
        { displayRef: "x", expectedVersionNo: 1 },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => null }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("denies a tenant actor acting outside their active partner", async () => {
    const outside = { ...existing, partnerId: "1a2b3c4d-5e6f-4789-90ab-cdef01234567" };
    await expect(
      updateAsset(
        existing.id,
        { displayRef: "x", expectedVersionNo: 1 },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => outside }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
  });

  it("fails closed when the repository reports a version conflict", async () => {
    await expect(
      updateAsset(
        existing.id,
        { displayRef: "x", expectedVersionNo: 1 },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({
            update: async () => ({
              ok: false,
              category: "VERSION_CONFLICT",
              rowsAffected: 0,
            }),
          }),
          auditSink: new RecordingAuditSink(),
        },
      ),
    ).rejects.toMatchObject({
      code: "conflict",
      name: "AssetUpdateFailureError",
      category: "VERSION_CONFLICT",
      rowsAffected: 0,
    });
  });
});
