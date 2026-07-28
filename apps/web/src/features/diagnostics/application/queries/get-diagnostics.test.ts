import { describe, expect, it } from "vitest";
import type { DiagnosticsRepository, DiagnosticsSnapshot } from "../ports/diagnostics-repository";
import { getDiagnostics } from "./get-diagnostics";

const snapshot: DiagnosticsSnapshot = {
  generatedAt: "2026-07-27T07:30:00.000Z",
  checks: [
    {
      id: "registry-integrity",
      category: "registry",
      outcome: "valid",
      code: "REGISTRY_INTEGRITY_VALID",
      title: "Registry integrity",
      detail: "Provider and Capability Registries match.",
      evidence: ["providers=3", "capabilities=14"],
    },
    {
      id: "capability-contracts",
      category: "capability",
      outcome: "valid",
      code: "CAPABILITY_CONTRACTS_VALID",
      title: "Capability contracts",
      detail: "Capability descriptors passed validation.",
      evidence: ["providers=3"],
    },
    {
      id: "environment-profiles",
      category: "environment",
      outcome: "invalid",
      code: "ENVIRONMENT_CONFIGURATION_INVALID",
      title: "Environment profiles",
      detail: "A required profile is missing.",
      evidence: ["required=4", "configured=3"],
    },
    {
      id: "configuration-bindings",
      category: "configuration",
      outcome: "unknown",
      code: "CONFIGURATION_VALIDATION_UNKNOWN",
      title: "Configuration bindings",
      detail: "The configuration snapshot could not be confirmed.",
      evidence: [],
    },
    {
      id: "operational-metrics",
      category: "read-model",
      outcome: "valid",
      code: "READ_MODEL_VALID",
      title: "Operational metrics read model",
      detail: "The read model shape is valid.",
      evidence: ["readiness=0"],
    },
  ],
};

class Repository implements DiagnosticsRepository {
  public async loadSnapshot(): Promise<DiagnosticsSnapshot> {
    return snapshot;
  }
}

describe("getDiagnostics", () => {
  it("projects validator outcomes and fails the system summary closed", async () => {
    const model = await getDiagnostics(new Repository());

    expect(model.systemIntegrity).toMatchObject({
      status: "FAIL",
      passed: 3,
      failed: 1,
      unknown: 1,
      total: 5,
    });
    expect(model.registryDiagnostics[0]?.status).toBe("PASS");
    expect(model.environmentValidation[0]?.status).toBe("FAIL");
    expect(model.configurationValidation[0]?.status).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for every area when the diagnostics snapshot is unavailable", async () => {
    const repository: DiagnosticsRepository = {
      loadSnapshot: async () => {
        throw new Error("snapshot unavailable");
      },
    };

    const model = await getDiagnostics(repository);

    expect(model.systemIntegrity).toMatchObject({ status: "UNKNOWN", passed: 0, failed: 0 });
    expect(model.systemIntegrity.unknown).toBe(5);
    expect([
      model.registryDiagnostics,
      model.capabilityValidation,
      model.environmentValidation,
      model.configurationValidation,
      model.readModelValidation,
    ]).toSatisfy((areas: readonly (readonly { status: string }[])[]) =>
      areas.every((area) => area.length === 1 && area[0]?.status === "UNKNOWN"),
    );
  });
});
