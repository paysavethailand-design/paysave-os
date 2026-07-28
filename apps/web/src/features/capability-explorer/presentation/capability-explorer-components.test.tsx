import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { CapabilityExplorerModel } from "../domain/capability-explorer";
import { CapabilityDetailView } from "./capability-detail-view";
import { CapabilityExplorerView } from "./capability-explorer-view";

const model: CapabilityExplorerModel = {
  generatedAt: "2026-07-27T00:00:00.000Z",
  summary: {
    capabilities: 2,
    categories: 2,
    providers: 3,
    supportedCells: 2,
    partialCells: 1,
    unsupportedCells: 2,
    experimentalCells: 1,
  },
  categories: [
    { name: "deployment", capabilities: 1 },
    { name: "release", capabilities: 1 },
  ],
  providers: ["github", "hostinger", "supabase"],
  capabilities: [
    {
      id: "deployment.docker-compose.execute",
      category: "deployment",
      counts: { SUPPORTED: 0, PARTIAL: 0, "NOT SUPPORTED": 2, EXPERIMENTAL: 1 },
      providers: [
        { providerId: "github", availability: "NOT SUPPORTED", plane: null, access: null },
        {
          providerId: "hostinger",
          availability: "EXPERIMENTAL",
          plane: "control",
          access: "write",
        },
        { providerId: "supabase", availability: "NOT SUPPORTED", plane: null, access: null },
      ],
    },
    {
      id: "release.read",
      category: "release",
      counts: { SUPPORTED: 2, PARTIAL: 1, "NOT SUPPORTED": 0, EXPERIMENTAL: 0 },
      providers: [
        {
          providerId: "github",
          availability: "SUPPORTED",
          plane: "source",
          access: "read",
        },
        {
          providerId: "hostinger",
          availability: "PARTIAL",
          plane: "control",
          access: "read",
        },
        {
          providerId: "supabase",
          availability: "SUPPORTED",
          plane: "data",
          access: "read",
        },
      ],
    },
  ],
};

describe("Capability Explorer components", () => {
  it("renders list, categories and responsive provider matrix without controls", () => {
    const html = renderToStaticMarkup(createElement(CapabilityExplorerView, { model }));

    for (const label of [
      "Capability Explorer",
      "Capability Categories",
      "Capability List",
      "Provider Capability Matrix",
      "SUPPORTED",
      "PARTIAL",
      "NOT SUPPORTED",
      "EXPERIMENTAL",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('data-layout="desktop-capability-matrix"');
    expect(html).toContain('data-layout="mobile-capability-matrix"');
    expect(html).toContain('href="/infrastructure/capabilities/release.read"');
    expect(html).not.toMatch(/<button|<select/);
  });

  it("renders a read-only capability detail for every provider state", () => {
    const capability = model.capabilities[1]!;
    const html = renderToStaticMarkup(
      createElement(CapabilityDetailView, { capability, providers: model.providers }),
    );

    expect(html).toContain("Capability Detail");
    expect(html).toContain("release.read");
    expect(html).toContain("github");
    expect(html).toContain("hostinger");
    expect(html).toContain("supabase");
    expect(html).toContain("SUPPORTED");
    expect(html).toContain("PARTIAL");
    expect(html).not.toMatch(/<button|<select/);
  });
});
