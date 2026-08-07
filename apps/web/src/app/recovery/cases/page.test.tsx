import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));

vi.mock("@/features/auth/server", () => ({ requirePermission }));
vi.mock("@/features/recovery-core", () => ({
  RECOVERY_PERMISSIONS: { CASES_READ: "cases.read" },
}));
vi.mock("@/features/recovery-management", () => ({ CaseListView: () => null }));

import RecoveryCasesPage from "./page";

describe("RecoveryCasesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retains the explicit cases.read route guard", async () => {
    await RecoveryCasesPage();

    expect(requirePermission).toHaveBeenCalledWith("cases.read", "/recovery/cases");
  });
});
