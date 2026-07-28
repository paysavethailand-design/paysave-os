import { describe, expect, it } from "vitest";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";
import { listPartners } from "./list-partners";

function partner(id: string): Partner {
  return {
    id,
    code: `partner-${id}`,
    name: `Partner ${id}`,
    status: "active",
    timezone: "Asia/Bangkok",
    defaultCurrency: "THB",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
  };
}

function fakeRepository(rows: readonly Partner[]): PartnerRepository {
  return {
    list: async () => rows,
    findById: async () => null,
    findByCode: async () => null,
    create: async () => partner("0"),
    update: async () => null,
    softDelete: async () => null,
  };
}

describe("listPartners", () => {
  it("returns a bounded page and reports the next cursor when more rows exist", async () => {
    const rows = [partner("1"), partner("2"), partner("3")];
    const page = await listPartners({ limit: 2, cursor: null }, fakeRepository(rows));
    expect(page.items).toHaveLength(2);
    expect(page.nextCursor).toBe("2");
  });
});
