import { createElement, type ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { businessModuleView, loadBusinessModule, notFound, requirePermission } = vi.hoisted(() => ({
  businessModuleView: vi.fn(),
  loadBusinessModule: vi.fn(),
  notFound: vi.fn(),
  requirePermission: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound,
}));
vi.mock("@/features/auth/server", () => ({
  requirePermission,
}));
vi.mock("@/features/business-platform", () => ({
  BusinessModuleView: businessModuleView,
  businessModuleFromSlug: (slug: string) => {
    if (slug === "reports") return "reports";
    if (slug === "finance") return "commission-finance";
    return null;
  },
}));
vi.mock("@/features/business-platform/server", () => ({
  loadBusinessModule,
}));

import BusinessModulePage, { dynamic } from "./page";

const model = {
  moduleId: "reports",
  status: "READY",
  title: "Reports",
  description: "Reports",
  publishedAt: "2026-08-06T00:00:00.000Z",
  source: "test",
  message: "ok",
  metrics: [],
  records: [],
} as const;

describe("BusinessModulePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    requirePermission.mockResolvedValue({});
    loadBusinessModule.mockResolvedValue(model);
    businessModuleView.mockReturnValue(createElement("div", null, "module"));
  });

  it("forces request-time rendering for permission-aware module routes", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("allows /business/reports only after reports.read succeeds", async () => {
    const rendered = (await BusinessModulePage({
      params: Promise.resolve({ module: "reports" }),
    })) as ReactElement<{ model: typeof model }>;

    expect(requirePermission).toHaveBeenCalledWith("reports.read", "/business/reports");
    expect(loadBusinessModule).toHaveBeenCalledWith("reports");
    expect(rendered.type).toBe(businessModuleView);
    expect(rendered.props.model).toBe(model);
  });

  it("denies /business/reports before loading data when reports.read is missing", async () => {
    requirePermission.mockRejectedValueOnce(new Error("NEXT_REDIRECT"));

    await expect(
      BusinessModulePage({ params: Promise.resolve({ module: "reports" }) }),
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(loadBusinessModule).not.toHaveBeenCalled();
  });

  it("guards direct /business/payments with payments.read before opening the finance module", async () => {
    await BusinessModulePage({ params: Promise.resolve({ module: "payments" }) });

    expect(requirePermission).toHaveBeenCalledWith("payments.read", "/business/payments");
    expect(loadBusinessModule).toHaveBeenCalledWith("commission-finance");
  });

  it("guards direct /business/commission with commission.read before opening the finance module", async () => {
    await BusinessModulePage({ params: Promise.resolve({ module: "commission" }) });

    expect(requirePermission).toHaveBeenCalledWith("commission.read", "/business/commission");
    expect(loadBusinessModule).toHaveBeenCalledWith("commission-finance");
  });

  it("does not let /business/finance bypass explicit payments and commission permissions", async () => {
    await BusinessModulePage({ params: Promise.resolve({ module: "finance" }) });

    expect(requirePermission).toHaveBeenNthCalledWith(1, "payments.read", "/business/finance");
    expect(requirePermission).toHaveBeenNthCalledWith(2, "commission.read", "/business/finance");
    expect(loadBusinessModule).toHaveBeenCalledWith("commission-finance");
  });

  it("fails closed for unknown modules before loading data", async () => {
    await expect(
      BusinessModulePage({ params: Promise.resolve({ module: "unknown" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(requirePermission).not.toHaveBeenCalled();
    expect(loadBusinessModule).not.toHaveBeenCalled();
  });
});
