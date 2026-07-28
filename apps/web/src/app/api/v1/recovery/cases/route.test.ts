import type { AuthContext } from "@paysave/security";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { actor, requireApiPermission, listCasesUseCase, createCaseUseCase } = vi.hoisted(() => ({
  actor: {
    userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
    activePartnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
    roles: ["agent"],
    permissions: ["cases.read", "cases.manage"],
    tenantScope: "active",
    sessionVersion: 1,
  } satisfies AuthContext,
  requireApiPermission: vi.fn(),
  listCasesUseCase: vi.fn(),
  createCaseUseCase: vi.fn(),
}));

vi.mock("@/features/auth/server", () => ({
  requireApiPermission: (permission: string) => requireApiPermission(permission),
}));

vi.mock("@/features/recovery-core/server", () => ({
  RECOVERY_PERMISSIONS: {
    CASES_READ: "cases.read",
    CASES_MANAGE: "cases.manage",
  },
  listCasesUseCase: (query: unknown, context: unknown) => listCasesUseCase(query, context),
  createCaseUseCase: (body: unknown, context: unknown) => createCaseUseCase(body, context),
}));

const { GET, POST } = await import("./route");

beforeEach(() => {
  requireApiPermission.mockReset().mockResolvedValue(actor);
  listCasesUseCase.mockReset();
  createCaseUseCase.mockReset();
});

describe("GET /api/v1/recovery/cases", () => {
  it("requires cases.read and returns the bounded page envelope", async () => {
    listCasesUseCase.mockResolvedValue({ items: [{ id: "case-1" }], nextCursor: "next-1" });

    const response = await GET(
      new NextRequest("https://api.paysave.internal/api/v1/recovery/cases?limit=20"),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("cases.read");
    expect(listCasesUseCase).toHaveBeenCalledWith(
      { limit: "20" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: [{ id: "case-1" }],
      meta: expect.objectContaining({ nextCursor: "next-1" }),
    });
  });
});

describe("POST /api/v1/recovery/cases", () => {
  it("requires cases.manage and creates a case", async () => {
    createCaseUseCase.mockResolvedValue({ id: "case-1" });

    const response = await POST(
      new NextRequest("https://api.paysave.internal/api/v1/recovery/cases", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerId: "customer-1" }),
      }),
    );

    expect(requireApiPermission).toHaveBeenCalledWith("cases.manage");
    expect(createCaseUseCase).toHaveBeenCalledWith(
      { customerId: "customer-1" },
      expect.objectContaining({ actor }),
    );
    expect(response.status).toBe(201);
  });
});
