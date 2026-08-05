import type { AuthContext } from "@paysave/security";
import { RecordingAuditSink } from "@paysave/observability";
import { describe, expect, it } from "vitest";
import type { Asset } from "../../domain/entities/asset";
import type { AssetRepository, AssetStatusTransition } from "../ports/asset-repository";
import { changeAssetStatus } from "./change-asset-status";

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

const fixedClock = { now: () => new Date("2026-07-22T00:00:00.000Z") };

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

describe("changeAssetStatus", () => {
  it("transitions the status and bumps version_no", async () => {
    const auditSink = new RecordingAuditSink();
    const updated = await changeAssetStatus(
      existing.id,
      { toStatusCode: "repossessed", reasonCode: "recovery_completed" },
      { actor, correlationId: "c1" },
      { repository: fakeRepository(), auditSink, clock: fixedClock },
    );
    expect(updated.currentStatusCode).toBe("repossessed");
    expect(updated.versionNo).toBe(2);
    expect(auditSink.all()).toEqual([
      expect.objectContaining({
        action: "asset.status.change",
        outcome: "success",
        reason: "recovery_completed",
      }),
    ]);
  });

  it("rejects a no-op transition to the same status", async () => {
    await expect(
      changeAssetStatus(
        existing.id,
        { toStatusCode: "active", reasonCode: "noop" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository(),
          auditSink: new RecordingAuditSink(),
          clock: fixedClock,
        },
      ),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("rejects an invalid inventory lifecycle transition before writes or audit", async () => {
    let changeCalls = 0;
    const auditSink = new RecordingAuditSink();
    const received = { ...existing, currentStatusCode: "received" };

    await expect(
      changeAssetStatus(
        received.id,
        { toStatusCode: "closed", reasonCode: "skip" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({
            findById: async () => received,
            changeStatus: async () => {
              changeCalls += 1;
              return received;
            },
          }),
          auditSink,
          clock: fixedClock,
        },
      ),
    ).rejects.toMatchObject({ code: "conflict" });

    expect(changeCalls).toBe(0);
    expect(auditSink.all()).toHaveLength(0);
  });

  it("404s when the asset does not exist", async () => {
    await expect(
      changeAssetStatus(
        "missing",
        { toStatusCode: "repossessed", reasonCode: "x" },
        { actor, correlationId: "c1" },
        {
          repository: fakeRepository({ findById: async () => null }),
          auditSink: new RecordingAuditSink(),
          clock: fixedClock,
        },
      ),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
