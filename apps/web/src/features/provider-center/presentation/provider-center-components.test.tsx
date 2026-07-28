import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ProviderCenterModel } from "../domain/provider-center";
import { ProviderCenterView } from "./provider-center-view";
import { ProviderDetailView } from "./provider-detail-view";

const model: ProviderCenterModel = {
  generatedAt: "2026-07-27T00:00:00.000Z",
  summary: {
    providers: 1,
    healthyProviders: 1,
    supportedCapabilities: 1,
    experimentalCapabilities: 1,
  },
  providers: [
    {
      id: "hostinger",
      displayName: "Hostinger",
      health: "HEALTHY",
      connectionStatus: "REGISTERED",
      version: "NOT PUBLISHED",
      supportedCapabilities: [
        {
          id: "dns.record.read",
          category: "dns",
          plane: "control",
          access: "read",
          availability: "SUPPORTED",
        },
      ],
      experimentalFeatures: [
        {
          id: "deployment.docker-compose.execute",
          category: "deployment",
          plane: "control",
          access: "write",
          availability: "EXPERIMENTAL DISABLED",
        },
      ],
    },
  ],
};

describe("Provider Center components", () => {
  it("renders a navigable provider list with truthful registry metadata", () => {
    const html = renderToStaticMarkup(createElement(ProviderCenterView, { model }));

    expect(html).toContain("Provider List");
    expect(html).toContain("Hostinger");
    expect(html).toContain("REGISTERED");
    expect(html).toContain("NOT PUBLISHED");
    expect(html).toContain('href="/infrastructure/providers/hostinger"');
    expect(html).not.toMatch(/<button|<select/);
  });

  it("renders supported and disabled experimental capability details", () => {
    const html = renderToStaticMarkup(
      createElement(ProviderDetailView, { provider: model.providers[0]! }),
    );

    expect(html).toContain("Provider Details");
    expect(html).toContain("dns.record.read");
    expect(html).toContain("deployment.docker-compose.execute");
    expect(html).toContain("EXPERIMENTAL DISABLED");
    expect(html).not.toMatch(/<button|<select/);
  });
});
