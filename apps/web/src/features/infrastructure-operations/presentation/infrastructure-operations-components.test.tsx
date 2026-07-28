import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { InfrastructureOperationsModel } from "../domain/infrastructure-operations";
import { InfrastructureOperationsView } from "./infrastructure-operations-view";

const capability = {
  id: "deployment.docker-compose.execute",
  category: "deployment",
  providers: [
    { providerId: "github", availability: "NOT SUPPORTED" as const, plane: null, access: null },
    {
      providerId: "hostinger",
      availability: "EXPERIMENTAL" as const,
      plane: "control",
      access: "write",
    },
    { providerId: "supabase", availability: "PARTIAL" as const, plane: "control", access: "read" },
  ],
};

const domainDefinitions = [
  ["domain", "Domain Overview"],
  ["dns", "DNS Overview"],
  ["hosting", "Hosting Overview"],
  ["database", "Database Overview"],
  ["authentication", "Authentication Overview"],
  ["storage", "Storage Overview"],
  ["environment", "Environment Overview"],
] as const;

const model: InfrastructureOperationsModel = {
  generatedAt: "2026-07-27T00:00:00.000Z",
  providers: ["github", "hostinger", "supabase"],
  summary: {
    domains: 7,
    providers: 3,
    publishedCapabilities: 7,
    supportedCells: 0,
    partialCells: 7,
    unsupportedCells: 7,
    experimentalCells: 7,
  },
  domains: domainDefinitions.map(([id, label]) => ({
    id,
    label,
    description: `${label} registry capability coverage, not live resource state.`,
    capabilities: [capability],
    counts: { SUPPORTED: 0, PARTIAL: 1, "NOT SUPPORTED": 1, EXPERIMENTAL: 1 },
  })),
};

describe("Infrastructure Operations components", () => {
  it("renders all seven registry-only resource overviews without controls", () => {
    const html = renderToStaticMarkup(createElement(InfrastructureOperationsView, { model }));

    expect(html).toContain("Infrastructure Operations");
    for (const [, label] of domainDefinitions) expect(html).toContain(label);
    for (const state of ["SUPPORTED", "PARTIAL", "NOT SUPPORTED", "EXPERIMENTAL"])
      expect(html).toContain(state);
    expect(html).toContain("not live resource state");
    expect(html).toContain("deployment.docker-compose.execute");
    expect(html).not.toMatch(/<button|<select|<form/);
  });
});
