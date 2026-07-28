import { describe, expect, it } from "vitest";
import { Stage52InfrastructureOperationsRepository } from "./stage52-infrastructure-operations-repository";

describe("Stage52InfrastructureOperationsRepository", () => {
  it("reads immutable provider and capability manifests without provider access", async () => {
    const snapshot = await new Stage52InfrastructureOperationsRepository(
      () => new Date("2026-07-27T00:00:00.000Z"),
    ).loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T00:00:00.000Z");
    expect(snapshot.providers).toEqual(["github", "hostinger", "supabase"]);
    expect(snapshot.capabilities).toHaveLength(43);
    expect(snapshot.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "dns.record.read", providerId: "hostinger" }),
        expect.objectContaining({ id: "database.postgresql.query", providerId: "supabase" }),
        expect.objectContaining({
          id: "deployment.docker-compose.execute",
          providerId: "hostinger",
          status: "experimental",
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toMatch(
      /credential|secret|token|password|officialReferences|limitations/i,
    );
  });
});
