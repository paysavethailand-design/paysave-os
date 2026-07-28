import { describe, expect, it } from "vitest";
import { Stage52ProviderCenterRepository } from "./stage52-provider-center-repository";

describe("Stage52ProviderCenterRepository", () => {
  it("reads immutable provider and capability manifests without provider access", async () => {
    const repository = new Stage52ProviderCenterRepository(
      () => new Date("2026-07-27T04:30:00.000Z"),
    );

    const snapshot = await repository.loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T04:30:00.000Z");
    expect(snapshot.providers.map((provider) => provider.id)).toEqual([
      "github",
      "hostinger",
      "supabase",
    ]);
    expect(snapshot.providers.every((provider) => provider.registered)).toBe(true);
    expect(snapshot.providers.every((provider) => provider.version === null)).toBe(true);
    expect(snapshot.providers.every((provider) => provider.health === "unhealthy")).toBe(true);
    expect(snapshot.capabilities.length).toBeGreaterThan(0);
    expect(snapshot.capabilities.every((capability) => capability.providerId.length > 0)).toBe(
      true,
    );
    expect(JSON.stringify(snapshot)).not.toMatch(/credential|secret|token|password/i);
  });
});
