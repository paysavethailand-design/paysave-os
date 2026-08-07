import { beforeEach, describe, expect, it, vi } from "vitest";

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));

vi.mock("@/features/auth/server", () => ({ requirePermission }));
vi.mock("@/features/recovery-core", () => ({
  RECOVERY_PERMISSIONS: { ASSIGNMENTS_READ: "assignments.read" },
}));
vi.mock("@/features/recovery-management", () => ({ AssignmentView: () => null }));

import RecoveryAssignmentsPage from "./page";

describe("RecoveryAssignmentsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("retains the explicit assignments.read route guard", async () => {
    await RecoveryAssignmentsPage();

    expect(requirePermission).toHaveBeenCalledWith("assignments.read", "/recovery/assignments");
  });
});
