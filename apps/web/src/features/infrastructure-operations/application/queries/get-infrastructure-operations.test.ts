import { describe, expect, it } from "vitest";
import type { InfrastructureOperationsRepository } from "../ports/infrastructure-operations-repository";
import { getInfrastructureOperations } from "./get-infrastructure-operations";

const repository: InfrastructureOperationsRepository = {
  async loadSnapshot() {
    return {
      generatedAt: "2026-07-27T00:00:00.000Z",
      providers: ["github", "hostinger", "supabase"],
      capabilities: [
        {
          providerId: "hostinger",
          id: "domain.portfolio.read",
          category: "domain",
          plane: "control",
          access: "read",
          status: "supported",
        },
        {
          providerId: "hostinger",
          id: "dns.record.read",
          category: "dns",
          plane: "control",
          access: "read",
          status: "partial",
        },
        {
          providerId: "hostinger",
          id: "deployment.docker-compose.execute",
          category: "deployment",
          plane: "control",
          access: "write",
          status: "experimental",
        },
        {
          providerId: "supabase",
          id: "database.postgresql.query",
          category: "database",
          plane: "data",
          access: "write",
          status: "supported",
        },
        {
          providerId: "supabase",
          id: "authentication.session.manage",
          category: "authentication",
          plane: "data",
          access: "write",
          status: "supported",
        },
        {
          providerId: "supabase",
          id: "storage.object.manage",
          category: "storage",
          plane: "data",
          access: "write",
          status: "supported",
        },
        {
          providerId: "supabase",
          id: "health.service-status.read",
          category: "health",
          plane: "control",
          access: "read",
          status: "unconfirmed",
        },
      ],
    };
  },
};

describe("getInfrastructureOperations", () => {
  it("projects all seven read-only operation domains from registry snapshots", async () => {
    const model = await getInfrastructureOperations(repository);

    expect(model.domains.map((domain) => domain.id)).toEqual([
      "domain",
      "dns",
      "hosting",
      "database",
      "authentication",
      "storage",
      "environment",
    ]);
    expect(model.providers).toEqual(["github", "hostinger", "supabase"]);

    const dns = model.domains.find((domain) => domain.id === "dns")!;
    expect(dns.capabilities[0]?.providers).toEqual([
      expect.objectContaining({ providerId: "github", availability: "NOT SUPPORTED" }),
      expect.objectContaining({ providerId: "hostinger", availability: "PARTIAL" }),
      expect.objectContaining({ providerId: "supabase", availability: "NOT SUPPORTED" }),
    ]);

    const hosting = model.domains.find((domain) => domain.id === "hosting")!;
    expect(hosting.capabilities[0]?.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: "hostinger", availability: "EXPERIMENTAL" }),
      ]),
    );

    const environment = model.domains.find((domain) => domain.id === "environment")!;
    expect(environment.capabilities[0]?.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: "supabase", availability: "NOT SUPPORTED" }),
      ]),
    );

    expect(model.summary).toEqual({
      domains: 7,
      providers: 3,
      publishedCapabilities: 7,
      supportedCells: 4,
      partialCells: 1,
      unsupportedCells: 15,
      experimentalCells: 1,
    });
  });
});
