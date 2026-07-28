import { describe, expect, it } from "vitest";
import type { User } from "../../domain/entities/user";
import type { UserRepository } from "../ports/user-repository";
import { listUsers } from "./list-users";

function user(id: string): User {
  return {
    id,
    authSubject: `1a2b3c4d-5e6f-4789-90ab-cdef0123456${id}`,
    displayName: `User ${id}`,
    status: "active",
    lastSeenAt: "2026-07-01T00:00:00.000Z",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
  };
}

function fakeRepository(rows: readonly User[]): UserRepository {
  return {
    list: async () => rows,
    findById: async () => null,
    findByAuthSubject: async () => null,
    create: async () => user("0"),
    update: async () => null,
  };
}

describe("listUsers", () => {
  it("returns a bounded page and reports the next cursor when more rows exist", async () => {
    const rows = [user("1"), user("2"), user("3")];
    const page = await listUsers({ limit: 2, cursor: null }, fakeRepository(rows));
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("2");
  });
});
