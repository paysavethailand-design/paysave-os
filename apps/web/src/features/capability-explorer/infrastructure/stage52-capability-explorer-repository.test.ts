import { describe, expect, it } from "vitest";
import { Stage52CapabilityExplorerRepository } from "./stage52-capability-explorer-repository";

describe("Stage52CapabilityExplorerRepository", () => {
  it("reads only immutable capability candidates into a secret-free snapshot", async () => {
    const snapshot = await new Stage52CapabilityExplorerRepository(
      () => new Date("2026-07-27T00:00:00.000Z"),
    ).loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T00:00:00.000Z");
    expect(snapshot.candidates).toHaveLength(43);
    expect(new Set(snapshot.candidates.map((candidate) => candidate.providerId))).toEqual(
      new Set(["github", "hostinger", "supabase"]),
    );
    expect(snapshot.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          providerId: "hostinger",
          id: "deployment.docker-compose.execute",
          status: "experimental",
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toMatch(
      /credential|secret|token|password|officialReferences|limitations/i,
    );
  });
});
