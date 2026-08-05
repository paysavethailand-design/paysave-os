import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const { signOutAction } = vi.hoisted(() => ({ signOutAction: vi.fn() }));

vi.mock("@/features/auth/actions", () => ({ signOutAction }));

import {
  DashboardSignOutForm,
  getDashboardNavigation,
  getRecoveryNavigation,
} from "./dashboard-shell";

describe("DashboardSignOutForm", () => {
  it("submits the real sign-out action instead of navigating to the login alias", () => {
    const form = DashboardSignOutForm() as ReactElement<{
      action: typeof signOutAction;
      children: ReactElement<{ type: string }>;
    }>;

    expect(form.type).toBe("form");
    expect(form.props.action).toBe(signOutAction);
    expect(form.props.children.props.type).toBe("submit");
  });
});

describe("getDashboardNavigation", () => {
  it("hides Inventory when assets.read is absent", () => {
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["admin"] }).map(
        (item) => item.href,
      ),
    ).not.toContain("/inventory");
  });

  it("shows Inventory when assets.read is present", () => {
    expect(
      getDashboardNavigation({ canViewInventory: true, roles: ["admin"] }).map((item) => item.href),
    ).toContain("/inventory");
  });

  it("shows every dashboard to admin and super_admin", () => {
    const expected = [
      "/dashboard/executive",
      "/dashboard/admin",
      "/dashboard/partner",
      "/dashboard/field",
      "/dashboard/supervisor",
      "/dashboard/personal",
    ];
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["admin"] }).map(
        (item) => item.href,
      ),
    ).toEqual(expected);
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["super_admin"] }).map(
        (item) => item.href,
      ),
    ).toEqual(expected);
  });

  it("keeps the original role dashboards least-privileged", () => {
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["partner"] }).map(
        (item) => item.href,
      ),
    ).toEqual(["/dashboard/partner"]);
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["supervisor"] }).map(
        (item) => item.href,
      ),
    ).toEqual(["/dashboard/field", "/dashboard/supervisor"]);
    expect(
      getDashboardNavigation({ canViewInventory: false, roles: ["agent"] }).map(
        (item) => item.href,
      ),
    ).toEqual(["/dashboard/field", "/dashboard/personal"]);
  });
});

describe("getRecoveryNavigation", () => {
  it("uses the same exact permission codes as the page gates", () => {
    expect(getRecoveryNavigation(["cases.read"]).map((item) => item.href)).toEqual([
      "/recovery/cases",
    ]);
    expect(getRecoveryNavigation(["assignments.read"]).map((item) => item.href)).toEqual([
      "/recovery/assignments",
    ]);
    expect(
      getRecoveryNavigation(["cases.read", "assignments.read"]).map((item) => item.href),
    ).toEqual(["/recovery/cases", "/recovery/assignments"]);
  });
});
