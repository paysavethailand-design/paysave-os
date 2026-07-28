import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { BusinessModuleModel } from "../domain/business-module";
import type { BusinessPlatformModel } from "../domain/business-platform";
import { BusinessModuleView } from "./business-module-view";
import { BusinessPlatformBreadcrumbView } from "./business-platform-breadcrumb-view";
import { BusinessPlatformNavigationView } from "./business-platform-navigation-view";
import { BusinessPlatformView } from "./business-platform-view";

const model: BusinessPlatformModel = {
  status: "BUSINESS PLATFORM READY",
  publishedAt: "2026-07-28T00:00:00.000Z",
  message: "Application Layer repository ports and trusted adapters are ready.",
  modules: [
    {
      id: "foundation",
      stage: "5.4A",
      title: "Business Platform Foundation",
      description: "Shared foundation.",
      status: "READY",
    },
    {
      id: "partner-management",
      stage: "5.4B",
      title: "Partner Management",
      description: "Partner views.",
      status: "READY",
    },
  ],
};

const moduleModel: BusinessModuleModel = {
  moduleId: "case-management",
  status: "READY",
  title: "Case Management",
  description: "Case read model.",
  publishedAt: "2026-07-28T00:00:00.000Z",
  source: "recovery.cases",
  message: "Live read model is available.",
  metrics: [{ label: "Cases", value: 1, detail: "Visible cases", tone: "neutral" }],
  records: [
    {
      id: "case-1",
      title: "Case ••••0001",
      status: "OPEN",
      detail: "High priority",
      occurredAt: "2026-07-28T01:30:00.000Z",
    },
  ],
};

const breadcrumbCases = [
  ["partners", "partner-management", "Partner Management"],
  ["cases", "case-management", "Case Management"],
  ["assignments", "assignment-engine", "Assignment Management"],
  ["workflows", "workflow-engine", "Workflow Management"],
  ["field-operations", "field-operations", "Field Operations"],
  ["finance", "commission-finance", "Commission & Finance"],
  ["dashboard", "executive-dashboard", "Executive Dashboard"],
  ["analytics", "business-analytics", "Business Analytics"],
  ["reports", "reports", "Reports"],
  ["notifications", "notifications", "Notifications"],
] as const;

const breadcrumbModules: BusinessPlatformModel["modules"] = breadcrumbCases.map(
  ([, id, title]) => ({
    id,
    stage: "5.4G",
    title,
    description: `${title} read model.`,
    status: "READY",
  }),
);

describe("Business Platform presentation", () => {
  it("renders active and available module links", () => {
    const html = renderToStaticMarkup(
      createElement(BusinessPlatformNavigationView, {
        modules: model.modules,
        pathname: "/business",
      }),
    );
    expect(html).toContain('aria-label="Business Platform modules"');
    expect(html).toContain('href="/business"');
    expect(html).toContain('href="/business/partners"');
    expect(html.match(/<a /g)).toHaveLength(2);
    expect(html).toContain('aria-current="page"');
    expect(html).not.toContain('aria-disabled="true"');
  });

  it("renders textual statuses and shared read-only module cards", () => {
    const html = renderToStaticMarkup(createElement(BusinessPlatformView, { model }));
    expect(html).toContain("Business Platform");
    expect(html).toContain("BUSINESS PLATFORM READY");
    expect(html).toContain("28 Jul 2026, 00:00 UTC");
    expect(html.match(/data-business-module=/g)).toHaveLength(2);
    expect(html).toContain("Application Layer");
    expect(html).not.toMatch(/<button|<form|<input|<select|<textarea/i);
    expect(html).not.toMatch(/secret|token|password|credential|connection string|api[_-]?key/i);
  });

  it("renders mobile record cards, a desktop table, and explicit UTC timestamps", () => {
    const html = renderToStaticMarkup(createElement(BusinessModuleView, { model: moduleModel }));
    expect(html).toContain('data-record-layout="mobile"');
    expect(html).toContain('data-record-layout="desktop"');
    expect(html).toContain("Case ••••0001");
    expect(html).toContain("OPEN");
    expect(html).toContain("High priority");
    expect(html).toContain("28 Jul 2026, 01:30 UTC");
  });

  it.each(breadcrumbCases)("renders /business/%s in the runtime breadcrumb", (slug, _id, title) => {
    const html = renderToStaticMarkup(
      createElement(BusinessPlatformBreadcrumbView, {
        modules: breadcrumbModules,
        pathname: `/business/${slug}`,
      }),
    );
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('href="/business"');
    expect(html).toContain(title.replace("&", "&amp;"));
    expect(html).toContain('aria-current="page"');
  });
});
