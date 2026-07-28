import { describe, expect, it } from "vitest";
import { buildBreadcrumbs } from "./breadcrumbs";

describe("buildBreadcrumbs", () => {
  it("builds readable Thai breadcrumbs from a nested route", () => {
    expect(buildBreadcrumbs("/cases/CASE-1001")).toEqual([
      { label: "หน้าหลัก", href: "/" },
      { label: "เคส", href: "/cases" },
      { label: "CASE-1001", href: null },
    ]);
  });

  it("labels the Business Platform foundation route", () => {
    expect(buildBreadcrumbs("/business")).toEqual([
      { label: "หน้าหลัก", href: "/" },
      { label: "Business Platform", href: null },
    ]);
  });

  it.each([
    ["partners", "Partner Management"],
    ["cases", "Case Management"],
    ["assignments", "Assignment Management"],
    ["workflows", "Workflow Management"],
    ["field-operations", "Field Operations"],
    ["finance", "Commission & Finance"],
    ["dashboard", "Executive Dashboard"],
    ["analytics", "Business Analytics"],
    ["reports", "Reports"],
    ["notifications", "Notifications"],
  ])("labels the /business/%s module route", (slug, label) => {
    expect(buildBreadcrumbs(`/business/${slug}`)).toEqual([
      { label: "หน้าหลัก", href: "/" },
      { label: "Business Platform", href: "/business" },
      { label, href: null },
    ]);
  });

  it("returns only the home item for the dashboard root", () => {
    expect(buildBreadcrumbs("/")).toEqual([{ label: "หน้าหลัก", href: null }]);
  });
});
