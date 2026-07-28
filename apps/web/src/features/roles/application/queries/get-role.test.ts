import { describe, expect, it } from "vitest";
import type { Role } from "../../domain/entities/role";
import type { RoleRepository } from "../ports/role-repository";
import { getRole } from "./get-role";

const existing: Role = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  partnerId: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  templateId: null,
  code: "supervisor-l2",
  name: "Supervisor L2",
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

function fakeRepository(overrides: Partial<RoleRepository> = {}): RoleRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByCode: async () => null,
    create: async () => existing,
    update: async () => existing,
    softDelete: async () => existing,
    ...overrides,
  };
}

describe("getRole", () => {
  it("returns the role when found", async () => {
    await expect(getRole(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws 404 when not found", async () => {
    await expect(
      getRole("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
