import { describe, expect, it } from "vitest";
import { Stage52DiagnosticsRepository } from "./stage52-diagnostics-repository";

const validMetrics = {
  healthzRequests: 1,
  readyzRequests: 2,
  versionRequests: 3,
  metricsRequests: 4,
  unhandledRouteErrors: 0,
  readinessStatus: 1 as const,
};

describe("Stage52DiagnosticsRepository", () => {
  it("returns secret-free validator and read-model outcomes without provider access", async () => {
    const repository = new Stage52DiagnosticsRepository(
      () => validMetrics,
      () => new Date("2026-07-27T08:00:00.000Z"),
    );

    const snapshot = await repository.loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T08:00:00.000Z");
    expect(snapshot.checks.map((check) => check.category)).toEqual([
      "registry",
      "capability",
      "environment",
      "configuration",
      "read-model",
    ]);
    expect(snapshot.checks.every((check) => check.outcome === "valid")).toBe(true);
    expect(JSON.stringify(snapshot)).not.toMatch(/secret|credential|password|token/i);
  });

  it("fails a malformed operational metrics read model closed", async () => {
    const repository = new Stage52DiagnosticsRepository(() => ({
      ...validMetrics,
      healthzRequests: -1,
    }));

    const snapshot = await repository.loadSnapshot();
    const readModel = snapshot.checks.find((check) => check.category === "read-model");

    expect(readModel).toMatchObject({ outcome: "invalid", code: "READ_MODEL_VALIDATION_FAILED" });
  });
});
