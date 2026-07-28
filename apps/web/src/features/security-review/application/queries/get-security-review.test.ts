import { describe, expect, it } from "vitest";
import type { SecurityReviewRepository } from "../ports/security-review-repository";
import { getSecurityReview } from "./get-security-review";

function repository(
  checks: Awaited<ReturnType<SecurityReviewRepository["loadSnapshot"]>>["checks"],
): SecurityReviewRepository {
  return {
    async loadSnapshot() {
      return { generatedAt: "2026-07-27T09:00:00.000Z", checks };
    },
  };
}

describe("getSecurityReview", () => {
  it("projects all review areas and fails compliance when a validator finding fails", async () => {
    const model = await getSecurityReview(
      repository([
        {
          id: "architecture-rules",
          category: "architecture-boundary",
          outcome: "valid",
          code: "ARCHITECTURE_BOUNDARY_VALID",
          title: "Architecture boundary",
          detail: "Architecture rules passed.",
          evidence: ["rules=21"],
          findings: [],
        },
        {
          id: "layer-isolation",
          category: "layer-isolation",
          outcome: "valid",
          code: "LAYER_ISOLATION_VALID",
          title: "Layer isolation",
          detail: "Layer rules passed.",
          evidence: ["violations=0"],
          findings: [],
        },
        {
          id: "provider-isolation",
          category: "provider-isolation",
          outcome: "invalid",
          code: "PROVIDER_ISOLATION_INVALID",
          title: "Provider isolation",
          detail: "A provider boundary finding exists.",
          evidence: ["findings=1"],
          findings: [
            {
              id: "provider-direct-call",
              severity: "HIGH",
              title: "Direct provider call",
              detail: "A direct provider path was reported by the security read model.",
            },
          ],
        },
        {
          id: "secret-exposure",
          category: "secret-exposure",
          outcome: "valid",
          code: "SECRET_EXPOSURE_VALID",
          title: "Secret exposure",
          detail: "No exposed values were reported.",
          evidence: ["valuesRendered=0"],
          findings: [],
        },
        {
          id: "permission-boundary",
          category: "permission-boundary",
          outcome: "unknown",
          code: "PERMISSION_BOUNDARY_UNKNOWN",
          title: "Permission boundary",
          detail: "Permission evidence is unavailable.",
          evidence: [],
          findings: [],
        },
      ]),
    );

    expect(model.generatedAt).toBe("2026-07-27T09:00:00.000Z");
    expect(model.architectureBoundaryStatus[0]?.status).toBe("PASS");
    expect(model.layerIsolationReview[0]?.status).toBe("PASS");
    expect(model.providerIsolationReview[0]?.status).toBe("FAIL");
    expect(model.secretExposureReview[0]?.status).toBe("PASS");
    expect(model.permissionBoundaryReview[0]?.status).toBe("UNKNOWN");
    expect(model.securityFindings).toEqual([
      expect.objectContaining({ id: "provider-direct-call", severity: "HIGH" }),
    ]);
    expect(model.complianceStatus).toMatchObject({
      status: "FAIL",
      passed: 3,
      failed: 1,
      unknown: 1,
      total: 5,
      findings: 1,
    });
  });

  it("fails closed to UNKNOWN for every required area when the repository throws", async () => {
    const model = await getSecurityReview({
      async loadSnapshot() {
        throw new Error("read model unavailable");
      },
    });

    expect(model.generatedAt).toBe(new Date(0).toISOString());
    expect(model.complianceStatus).toMatchObject({
      status: "UNKNOWN",
      passed: 0,
      failed: 0,
      unknown: 5,
      total: 5,
    });
    expect([
      ...model.architectureBoundaryStatus,
      ...model.layerIsolationReview,
      ...model.providerIsolationReview,
      ...model.secretExposureReview,
      ...model.permissionBoundaryReview,
    ]).toHaveLength(5);
  });
});
