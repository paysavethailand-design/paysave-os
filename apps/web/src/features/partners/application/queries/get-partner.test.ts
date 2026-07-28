import { describe, expect, it } from "vitest";
import type { Partner } from "../../domain/entities/partner";
import type { PartnerRepository } from "../ports/partner-repository";
import { getPartner } from "./get-partner";

const existing: Partner = {
  id: "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41",
  code: "acme-recovery",
  name: "ACME Recovery",
  status: "active",
  timezone: "Asia/Bangkok",
  defaultCurrency: "THB",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  deletedAt: null,
};

function fakeRepository(overrides: Partial<PartnerRepository> = {}): PartnerRepository {
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

describe("getPartner", () => {
  it("returns the partner when found", async () => {
    await expect(getPartner(existing.id, fakeRepository())).resolves.toEqual(existing);
  });

  it("throws 404 when not found", async () => {
    await expect(
      getPartner("missing", fakeRepository({ findById: async () => null })),
    ).rejects.toMatchObject({ code: "not_found" });
  });
});
