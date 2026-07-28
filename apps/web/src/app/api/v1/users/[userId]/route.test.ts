import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["users.read", "users.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const getUserUseCase = vi.fn();
const updateUserUseCase = vi.fn();
const deactivateUserUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/users/server", () => ({
  getUserUseCase: (id: string) => getUserUseCase(id),
  updateUserUseCase: (id: string, body: unknown, context: unknown) =>
    updateUserUseCase(id, body, context),
  deactivateUserUseCase: (id: string, body: unknown, context: unknown) =>
    deactivateUserUseCase(id, body, context),
  USERS_PERMISSIONS: { READ: "users.read", MANAGE: "users.manage" },
}));

const { GET, PATCH, DELETE } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  getUserUseCase.mockReset();
  updateUserUseCase.mockReset();
  deactivateUserUseCase.mockReset();
});

function paramsFor(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

describe("GET /api/v1/users/[userId]", () => {
  it("returns the user", async () => {
    getUserUseCase.mockResolvedValue({ id: "1" });
    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/users/1"),
      paramsFor("1"),
    );
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/v1/users/[userId]", () => {
  it("requires users.manage and forwards the patch", async () => {
    updateUserUseCase.mockResolvedValue({ id: "1", status: "active" });
    const response = await PATCH(
      new NextRequest("https://api.paysave.internal/api/v1/users/1", {
        method: "PATCH",
        body: JSON.stringify({ status: "active" }),
      }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("users.manage");
    expect(response.status).toBe(200);
  });
});

describe("DELETE /api/v1/users/[userId]", () => {
  it("deactivates the user with no request body", async () => {
    deactivateUserUseCase.mockResolvedValue({ id: "1", status: "suspended" });
    const response = await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/users/1", { method: "DELETE" }),
      paramsFor("1"),
    );
    expect(requireApiPermission).toHaveBeenCalledWith("users.manage");
    expect(deactivateUserUseCase).toHaveBeenCalledWith("1", {}, expect.objectContaining({ actor }));
    expect(response.status).toBe(200);
  });

  it("forwards an optional reason", async () => {
    deactivateUserUseCase.mockResolvedValue({ id: "1", status: "suspended" });
    await DELETE(
      new NextRequest("https://api.paysave.internal/api/v1/users/1", {
        method: "DELETE",
        body: JSON.stringify({ reason: "offboarding" }),
      }),
      paramsFor("1"),
    );
    expect(deactivateUserUseCase).toHaveBeenCalledWith(
      "1",
      { reason: "offboarding" },
      expect.objectContaining({ actor }),
    );
  });
});
