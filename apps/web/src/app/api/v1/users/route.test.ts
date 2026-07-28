import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/lib/api-error";

const actor: AuthContext = {
  userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
  activePartnerId: null,
  roles: ["super_admin"],
  permissions: ["users.read", "users.manage"],
  tenantScope: "all",
  sessionVersion: 1,
};

const requireApiPermission = vi.fn().mockResolvedValue(actor);
const listUsersUseCase = vi.fn();
const createUserUseCase = vi.fn();

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/users/server", () => ({
  listUsersUseCase: (params: unknown) => listUsersUseCase(params),
  createUserUseCase: (body: unknown, context: unknown) => createUserUseCase(body, context),
  USERS_PERMISSIONS: { READ: "users.read", MANAGE: "users.manage" },
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listUsersUseCase.mockReset();
  createUserUseCase.mockReset();
});

describe("GET /api/v1/users", () => {
  it("requires users.read and returns a bounded page", async () => {
    listUsersUseCase.mockResolvedValue({ items: [{ id: "1" }], nextCursor: null });
    const response = await GET(new NextRequest("https://api.paysave.internal/api/v1/users"));
    expect(requireApiPermission).toHaveBeenCalledWith("users.read");
    expect(response.status).toBe(200);
  });

  it("propagates a 403 when the permission check fails", async () => {
    requireApiPermission.mockRejectedValueOnce(new ApiError("forbidden", "nope"));
    const response = await GET(new NextRequest("https://api.paysave.internal/api/v1/users"));
    expect(response.status).toBe(403);
  });
});

describe("POST /api/v1/users", () => {
  it("requires users.manage and delegates to the use case", async () => {
    createUserUseCase.mockResolvedValue({ id: "1" });
    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/users", {
        method: "POST",
        body: JSON.stringify({
          authSubject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
          displayName: "Somchai",
        }),
      }),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("users.manage");
    expect(response.status).toBe(201);
  });
});
