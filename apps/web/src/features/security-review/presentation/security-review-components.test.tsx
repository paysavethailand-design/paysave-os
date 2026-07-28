import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SecurityReviewModel } from "../domain/security-review";
import { ComplianceDashboard } from "./compliance-dashboard";
import { SecurityFindingsView } from "./security-findings-view";
import { SecurityReviewStatusBadge } from "./security-review-status-badge";
import { SecurityReviewView } from "./security-review-view";

const check = (id: string, status: "PASS" | "FAIL" | "UNKNOWN") => ({
  id,
  status,
  code: `${id.toUpperCase().replace(/-/g, "_")}_${status}`,
  title: `${id} control review`,
  detail: "Declarative Security Validator and Read Model evidence only.",
  evidence: [`${id}Controls=3`],
});

const model: SecurityReviewModel = {
  generatedAt: "2026-07-27T10:00:00.000Z",
  architectureBoundaryStatus: [check("architecture-boundary", "PASS")],
  layerIsolationReview: [check("layer-isolation", "PASS")],
  providerIsolationReview: [check("provider-isolation", "FAIL")],
  secretExposureReview: [{ ...check("secret-exposure", "UNKNOWN"), evidence: [] }],
  permissionBoundaryReview: [check("permission-boundary", "PASS")],
  securityFindings: [
    {
      id: "provider-isolation-control-missing",
      severity: "HIGH",
      title: "Provider isolation control finding",
      detail: "A required declarative provider isolation control is not confirmed.",
    },
  ],
  complianceStatus: {
    status: "FAIL",
    passed: 3,
    failed: 1,
    unknown: 1,
    total: 5,
    findings: 1,
    detail: "One or more security checks failed.",
  },
};

describe("Security Review runtime components", () => {
  it("renders the compliance dashboard, findings, all review areas, and textual statuses", () => {
    const html = renderToStaticMarkup(React.createElement(SecurityReviewView, { model }));

    for (const heading of [
      "Security Review",
      "Compliance Status",
      "Security Findings Summary",
      "Architecture Boundary Status",
      "Layer Isolation Review",
      "Provider Isolation Review",
      "Secret Exposure Review",
      "Permission Boundary Review",
    ]) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("PASS");
    expect(html).toContain("FAIL");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("HIGH");
    expect(html).toContain("Evidence");
    expect(html).toContain("declarative build-time controls");
  });

  it("renders textual PASS and UNKNOWN states plus empty and multi-severity findings", () => {
    const badges = renderToStaticMarkup(
      <>
        <SecurityReviewStatusBadge status="PASS" />
        <SecurityReviewStatusBadge status="UNKNOWN" />
      </>,
    );
    const dashboard = renderToStaticMarkup(
      <ComplianceDashboard
        summary={{
          status: "UNKNOWN",
          passed: 2,
          failed: 0,
          unknown: 3,
          total: 5,
          findings: 0,
          detail: "Evidence is incomplete.",
        }}
      />,
    );
    const empty = renderToStaticMarkup(<SecurityFindingsView findings={[]} />);
    const severities = renderToStaticMarkup(
      <SecurityFindingsView
        findings={(["HIGH", "MEDIUM", "LOW", "INFO"] as const).map((severity) => ({
          id: `finding-${severity}`,
          severity,
          title: `${severity} finding`,
          detail: "Safe finding detail",
        }))}
      />,
    );

    expect(badges).toContain("PASS");
    expect(badges).toContain("UNKNOWN");
    expect(dashboard).toContain("Compliance Status");
    expect(empty).toContain("No Security Validator findings are present");
    for (const severity of ["HIGH", "MEDIUM", "LOW", "INFO"]) {
      expect(severities).toContain(severity);
    }
  });

  it("is read-only and does not render action controls or sensitive values", () => {
    const html = renderToStaticMarkup(React.createElement(SecurityReviewView, { model }));

    expect(html).not.toMatch(/<(button|form|select|input|textarea)\b/i);
    expect(html).not.toMatch(/retry|remediate|acknowledge|execute provider/i);
    expect(html).not.toContain("example-sensitive-value");
  });
});
