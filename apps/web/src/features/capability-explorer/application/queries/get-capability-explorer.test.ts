import { describe, expect, it } from "vitest";
import type { CapabilityExplorerRepository } from "../ports/capability-explorer-repository";
import { getCapabilityExplorer } from "./get-capability-explorer";

const repository: CapabilityExplorerRepository = {
  async loadSnapshot() {
    return {
      generatedAt: "2026-07-27T00:00:00.000Z",
      candidates: [
        {
          providerId: "github",
          id: "release.read",
          category: "release",
          plane: "source",
          access: "read",
          status: "supported",
        },
        {
          providerId: "hostinger",
          id: "release.read",
          category: "release",
          plane: "control",
          access: "read",
          status: "partial",
        },
        {
          providerId: "supabase",
          id: "database.read",
          category: "database",
          plane: "data",
          access: "read",
          status: "supported",
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
          providerId: "hostinger",
          id: "database.branch",
          category: "database",
          plane: "control",
          access: "write",
          status: "unsupported",
        },
      ],
    };
  },
};

describe("getCapabilityExplorer", () => {
  it("builds a provider matrix from Capability Registry candidates with fail-closed states", async () => {
    const model = await getCapabilityExplorer(repository);

    expect(model.providers).toEqual(["github", "hostinger", "supabase"]);
    expect(model.categories).toEqual([
      { name: "database", capabilities: 2 },
      { name: "deployment", capabilities: 1 },
      { name: "release", capabilities: 1 },
    ]);

    const release = model.capabilities.find((capability) => capability.id === "release.read");
    expect(release?.providers).toEqual([
      expect.objectContaining({ providerId: "github", availability: "SUPPORTED" }),
      expect.objectContaining({ providerId: "hostinger", availability: "PARTIAL" }),
      expect.objectContaining({ providerId: "supabase", availability: "NOT SUPPORTED" }),
    ]);

    const experimental = model.capabilities.find(
      (capability) => capability.id === "deployment.docker-compose.execute",
    );
    expect(experimental?.providers.find((provider) => provider.providerId === "hostinger")).toEqual(
      expect.objectContaining({ availability: "EXPERIMENTAL" }),
    );

    const unsupported = model.capabilities.find(
      (capability) => capability.id === "database.branch",
    );
    expect(unsupported?.providers.find((provider) => provider.providerId === "hostinger")).toEqual(
      expect.objectContaining({ availability: "NOT SUPPORTED" }),
    );

    expect(model.summary).toEqual({
      capabilities: 4,
      categories: 3,
      providers: 3,
      supportedCells: 2,
      partialCells: 1,
      unsupportedCells: 8,
      experimentalCells: 1,
    });
  });
});
