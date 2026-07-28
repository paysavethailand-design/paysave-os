import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DiagnosticsModel } from "../domain/diagnostics";
import { DiagnosticsView } from "./diagnostics-view";

const check = (id: string, status: "PASS" | "FAIL" | "UNKNOWN") => ({
  id,
  status,
  code: `${id.toUpperCase()}_${status}`,
  title: `${id} validation`,
  detail: `${id} outcome is supplied by a Validator or Read Model.`,
  evidence: [`${id}Count=3`],
});

const model: DiagnosticsModel = {
  generatedAt: "2026-07-27T08:30:00.000Z",
  systemIntegrity: {
    status: "UNKNOWN",
    passed: 3,
    failed: 1,
    unknown: 1,
    total: 5,
    detail: "One or more outcomes are unavailable or unconfirmed.",
  },
  registryDiagnostics: [check("registry", "PASS")],
  capabilityValidation: [check("capability", "PASS")],
  environmentValidation: [check("environment", "FAIL")],
  configurationValidation: [check("configuration", "PASS")],
  readModelValidation: [
    {
      ...check("read-model", "UNKNOWN"),
      evidence: [],
    },
  ],
};

describe("Diagnostics runtime components", () => {
  it("renders all diagnostics areas with textual fail-closed statuses and evidence", () => {
    const html = renderToStaticMarkup(React.createElement(DiagnosticsView, { model }));

    for (const heading of [
      "Diagnostics",
      "System Integrity Summary",
      "Registry Diagnostics",
      "Capability Validation",
      "Environment Validation",
      "Configuration Validation",
      "Read Model Validation",
    ]) {
      expect(html).toContain(heading);
    }
    expect(html).toContain("PASS");
    expect(html).toContain("FAIL");
    expect(html).toContain("UNKNOWN");
    expect(html).toContain("Evidence");
    expect(html).toContain("Read-only Validator and Read Model results");
  });

  it("renders no provider controls, forms, or secret-bearing labels", () => {
    const html = renderToStaticMarkup(React.createElement(DiagnosticsView, { model }));

    expect(html).not.toMatch(/<(button|form|select|input|textarea)\b/i);
    expect(html).not.toMatch(/execute provider|retry|remediate|acknowledge/i);
    expect(html).not.toMatch(/password|credential|api[_ -]?key|access[_ -]?token/i);
  });
});
