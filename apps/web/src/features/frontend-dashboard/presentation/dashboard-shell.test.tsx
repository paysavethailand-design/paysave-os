import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

const { signOutAction } = vi.hoisted(() => ({ signOutAction: vi.fn() }));

vi.mock("@/features/auth/actions", () => ({ signOutAction }));

import { DashboardSignOutForm, getDashboardNavigation } from "./dashboard-shell";

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
    expect(getDashboardNavigation(false).map((item) => item.href)).not.toContain("/inventory");
  });

  it("shows Inventory when assets.read is present", () => {
    expect(getDashboardNavigation(true).map((item) => item.href)).toContain("/inventory");
  });
});
