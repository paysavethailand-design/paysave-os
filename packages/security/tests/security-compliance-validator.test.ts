import { describe, expect, it } from "vitest";
import {
  SecurityComplianceValidator,
  createSecurityReviewReadModel,
  type SecurityReviewReadModel,
} from "../src";

function replaceControl(
  model: SecurityReviewReadModel,
  category: SecurityReviewReadModel["controls"][number]["category"],
  change: (
    control: SecurityReviewReadModel["controls"][number],
  ) => SecurityReviewReadModel["controls"][number],
): SecurityReviewReadModel {
  return {
    controls: model.controls.map((control) =>
      control.category === category ? change(control) : control,
    ),
  };
}

describe("SecurityComplianceValidator", () => {
  it("validates the complete secret-free control read model", () => {
    const result = new SecurityComplianceValidator().validate(createSecurityReviewReadModel());

    expect(result.checks).toHaveLength(5);
    expect(result.checks.map((check) => check.category)).toEqual([
      "architecture-boundary",
      "layer-isolation",
      "provider-isolation",
      "secret-exposure",
      "permission-boundary",
    ]);
    expect(result.checks.every((check) => check.outcome === "valid")).toBe(true);
    expect(result.checks.flatMap((check) => check.findings)).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("example-secret-value");
  });

  it("reports a fail-closed finding when a required provider isolation rule is absent", () => {
    const model = createSecurityReviewReadModel();
    const incomplete = replaceControl(model, "provider-isolation", (control) => ({
      ...control,
      enforcedRuleIds: control.enforcedRuleIds.filter(
        (rule) => rule !== "infrastructure-ui-direct-call",
      ),
    }));

    const result = new SecurityComplianceValidator().validate(incomplete);
    const check = result.checks.find((candidate) => candidate.category === "provider-isolation");

    expect(check).toMatchObject({ outcome: "invalid", code: "PROVIDER_ISOLATION_INVALID" });
    expect(check?.findings).toEqual([
      expect.objectContaining({ severity: "HIGH", id: "provider-isolation-control-missing" }),
    ]);
  });

  it("returns unknown rather than pass when architecture evidence is unavailable", () => {
    const model = createSecurityReviewReadModel();
    const unavailable = replaceControl(model, "architecture-boundary", (control) => ({
      ...control,
      evidenceStatus: "unavailable",
    }));

    const result = new SecurityComplianceValidator().validate(unavailable);

    expect(result.checks.find((check) => check.category === "architecture-boundary")).toMatchObject(
      { outcome: "unknown", code: "ARCHITECTURE_BOUNDARY_UNKNOWN" },
    );
  });

  it("fails permission review when denial scenarios are not confirmed", () => {
    const model = createSecurityReviewReadModel();
    const invalid = replaceControl(model, "permission-boundary", (control) => ({
      ...control,
      assertions: { ...control.assertions, tenantMismatchDenied: false },
    }));

    const result = new SecurityComplianceValidator().validate(invalid);
    const check = result.checks.find((candidate) => candidate.category === "permission-boundary");

    expect(check).toMatchObject({ outcome: "invalid", code: "PERMISSION_BOUNDARY_INVALID" });
    expect(check?.findings).toEqual([
      expect.objectContaining({ severity: "HIGH", id: "permission-boundary-control-failed" }),
    ]);
  });
});
