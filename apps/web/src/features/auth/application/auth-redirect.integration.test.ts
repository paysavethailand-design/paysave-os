import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthContext } from "@paysave/security";

const { redirectMock, requireAuthMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string): never => {
    throw new Error(`REDIRECT:${path}`);
  }),
  requireAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/auth/server", () => ({
  requireAuth: requireAuthMock,
}));

import HomePage from "../../../app/page";
import LoginPage from "../../../app/login/page";
import SignInPage from "../../../app/(auth)/sign-in/page";
import { SignInForm } from "../presentation/sign-in-form";
import { resolveSessionRedirect } from "./session-navigation";

const adminContext: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: "42",
  roles: ["admin"],
  permissions: [],
  tenantScope: "active",
  sessionVersion: 1,
};

function containsElementType(node: ReactNode, type: unknown): boolean {
  if (Array.isArray(node)) return node.some((child) => containsElementType(child, type));
  if (!node || typeof node !== "object" || !("type" in node)) return false;

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (element.type === type) return true;
  return containsElementType(element.props.children, type);
}

describe("authenticated redirect integration", () => {
  beforeEach(() => {
    redirectMock.mockClear();
    requireAuthMock.mockReset();
    requireAuthMock.mockResolvedValue(adminContext);
  });

  it("shows the canonical sign-in form to an unauthenticated request", async () => {
    const page = await SignInPage({ searchParams: Promise.resolve({}) });
    expect(containsElementType(page, SignInForm)).toBe(true);
  });

  it("redirects the legacy login route to the canonical sign-in route", () => {
    expect(() => LoginPage()).toThrow("REDIRECT:/sign-in");
    expect(redirectMock).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects an authenticated root request to the admin dashboard", async () => {
    await expect(Promise.resolve().then(() => HomePage())).rejects.toThrow(
      "REDIRECT:/dashboard/admin",
    );
    expect(requireAuthMock).toHaveBeenCalledWith("/");
    expect(redirectMock).toHaveBeenCalledWith("/dashboard/admin");
  });

  it("never sends an authenticated admin back to either login route", () => {
    expect(resolveSessionRedirect("/login", adminContext)).toBe("/dashboard/admin");
    expect(resolveSessionRedirect("/sign-in", adminContext)).toBe("/dashboard/admin");
  });
});
