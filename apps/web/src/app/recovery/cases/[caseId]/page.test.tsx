import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));

vi.mock("@/features/auth/server", () => ({ requirePermission }));
vi.mock("@/features/recovery-core/server", () => ({
  RECOVERY_PERMISSIONS: { CASES_READ: "cases.read" },
}));
vi.mock("@/features/recovery-management", () => ({
  CaseDetailView: ({ caseId }: { readonly caseId: string }) => createElement("div", null, caseId),
}));

import RecoveryCaseDetailPage from "./page";

describe("RecoveryCaseDetailPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the same cases.read gate as the Recovery Cases list", async () => {
    const rendered = await RecoveryCaseDetailPage({
      params: Promise.resolve({ caseId: "case-1" }),
    });

    expect(requirePermission).toHaveBeenCalledWith("cases.read", "/recovery/cases/case-1");
    expect(rendered.props.caseId).toBe("case-1");
  });
});
