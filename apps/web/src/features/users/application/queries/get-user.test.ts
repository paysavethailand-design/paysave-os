import { describe, expect, it } from "vitest";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";
import { getUser } from "./get-user";

const existing: User = {
  id: "8f7a1e2b-2222-4d3d-9a1a-1111aaaa5555",
  authSubject: "1a2b3c4d-5e6f-4789-90ab-cdef01234567",
  displayName: "Somchai Prasert",
  status: "active",
  lastSeenAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
};

function fakeRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    list: async () => [],
    findById: async () => existing,
    findByAuthSubject: async () => null,
    create: async () => existing,
    update: async () => existing,
    ...overrides,
  };
}

describe("getUser", () => {
  it("returns the user when found", async () => {
    await expect(getUser(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws a 404 ApiError when not found", async () => {
    await expect(
      getUser("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({ code: "not_found", status: 404 });
  });
});
