import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InfrastructureCenterNavigation } from "./infrastructure-center-navigation";

const expectedRoutes = [
  "/infrastructure",
  "/infrastructure/providers",
  "/infrastructure/capabilities",
  "/infrastructure/operations",
  "/infrastructure/monitoring",
  "/infrastructure/diagnostics",
  "/infrastructure/security-review",
] as const;

describe("InfrastructureCenterNavigation", () => {
  it("renders one read-only entry point for every Stage 5.3 module", () => {
    const html = renderToStaticMarkup(<InfrastructureCenterNavigation />);

    for (const route of expectedRoutes) {
      expect(html).toContain(`href="${route}"`);
    }
    expect(html.match(/<a /g)).toHaveLength(expectedRoutes.length);
    expect(html).not.toMatch(/<button|<form|<input|<select|<textarea/i);
  });

  it("uses explicit module labels and a navigation landmark", () => {
    const html = renderToStaticMarkup(<InfrastructureCenterNavigation />);

    for (const label of [
      "Overview",
      "Providers",
      "Capabilities",
      "Operations",
      "Monitoring",
      "Diagnostics",
      "Security Review",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('aria-label="Infrastructure Center modules"');
  });
});
