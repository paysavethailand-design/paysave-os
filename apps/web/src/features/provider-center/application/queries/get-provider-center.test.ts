import { describe, expect, it } from "vitest";
import type { ProviderCenterRepository } from "../ports/provider-center-repository";
import { getProviderCenter } from "./get-provider-center";

const repository: ProviderCenterRepository = {
  async loadSnapshot() {
    return {
      generatedAt: "2026-07-27T04:00:00.000Z",
      providers: [
        {
          id: "supabase",
          displayName: "Supabase",
          version: null,
          health: "healthy",
          registered: true,
        },
        {
          id: "github",
          displayName: "GitHub",
          version: "2026-01",
          health: "degraded",
          registered: true,
        },
      ],
      capabilities: [
        {
          providerId: "supabase",
          id: "database.read",
          category: "database",
          plane: "data",
          access: "read",
          status: "supported",
        },
        {
          providerId: "supabase",
          id: "database.migrate",
          category: "database",
          plane: "control",
          access: "destructive",
          status: "experimental",
        },
        {
          providerId: "supabase",
          id: "database.branch",
          category: "database",
          plane: "control",
          access: "write",
          status: "unsupported",
        },
        {
          providerId: "github",
          id: "release.read",
          category: "release",
          plane: "source",
          access: "read",
          status: "partial",
        },
      ],
    };
  },
};

describe("getProviderCenter", () => {
  it("projects registry providers with supported and disabled experimental capabilities", async () => {
    const model = await getProviderCenter(repository);

    expect(model.summary).toEqual({
      providers: 2,
      healthyProviders: 1,
      supportedCapabilities: 2,
      experimentalCapabilities: 1,
    });

    expect(model.providers.map((provider) => provider.id)).toEqual(["github", "supabase"]);
    expect(model.providers[0]).toMatchObject({
      id: "github",
      version: "2026-01",
      health: "DEGRADED",
      connectionStatus: "REGISTERED",
    });
    expect(model.providers[1]).toMatchObject({
      id: "supabase",
      version: "NOT PUBLISHED",
      health: "HEALTHY",
      connectionStatus: "REGISTERED",
    });
    expect(model.providers[1]?.supportedCapabilities.map((item) => item.id)).toEqual([
      "database.read",
    ]);
    expect(model.providers[1]?.experimentalFeatures).toEqual([
      expect.objectContaining({
        id: "database.migrate",
        availability: "EXPERIMENTAL DISABLED",
      }),
    ]);
    expect(
      model.providers.flatMap((provider) => [
        ...provider.supportedCapabilities,
        ...provider.experimentalFeatures,
      ]),
    ).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: "database.branch" })]));
  });
});
