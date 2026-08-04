import type { AuthContext } from "@paysave/security";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "pilot-user",
  activePartnerId: "rc-staging-id",
  roles: ["admin"],
  permissions: ["assets.read", "assets.manage"],
  tenantScope: "active",
  sessionVersion: 2,
};

const { getInventoryDashboardUseCase, inventoryView, listAssetsUseCase, requirePermission } =
  vi.hoisted(() => ({
    getInventoryDashboardUseCase: vi.fn(),
    inventoryView: vi.fn(() => null),
    listAssetsUseCase: vi.fn(),
    requirePermission: vi.fn(),
  }));

vi.mock("@/features/auth/server", () => ({ requirePermission }));
vi.mock("@/features/assets/server", () => ({
  ASSETS_PERMISSIONS: { READ: "assets.read", MANAGE: "assets.manage" },
  getInventoryDashboardUseCase,
  listAssetsUseCase,
}));
vi.mock("@/features/assets", () => ({ InventoryManagementView: inventoryView }));

const { default: InventoryPage } = await import("./page");

describe("InventoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requirePermission.mockResolvedValue(actor);
    getInventoryDashboardUseCase.mockResolvedValue({ inventory: {}, sales: {} });
    listAssetsUseCase.mockResolvedValue({ items: [{ id: "a1" }], nextCursor: null });
  });

  it("requires assets.read and passes assets.manage capability to the edit UI", async () => {
    const element = await InventoryPage({ searchParams: Promise.resolve({}) });

    expect(requirePermission).toHaveBeenCalledWith("assets.read", "/inventory");
    expect(listAssetsUseCase).toHaveBeenCalledWith({ cursor: null, limit: 100 }, null, actor);
    expect(element.props).toMatchObject({
      assets: [{ id: "a1" }],
      canManage: true,
    });
  });

  it("uses and returns the tenant-scoped list cursor", async () => {
    listAssetsUseCase.mockResolvedValue({ items: [{ id: "a2" }], nextCursor: "cursor-3" });

    const element = await InventoryPage({
      searchParams: Promise.resolve({ cursor: "cursor-2" }),
    });

    expect(listAssetsUseCase).toHaveBeenCalledWith({ cursor: "cursor-2", limit: 100 }, null, actor);
    expect(element.props.nextCursor).toBe("cursor-3");
  });
});
