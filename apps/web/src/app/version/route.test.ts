import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { buildVersionPayload } from "./version";

describe("GET /version", () => {
  it("returns safe immutable release identity", async () => {
    const env = {
      NODE_ENV: "test",
      PAYSAVE_RELEASE_VERSION: "0.1.0-beta.1",
      PAYSAVE_SOURCE_REVISION: "a".repeat(40),
      PAYSAVE_BUILD_TIME: "2026-07-23T00:00:00.000Z",
    } as NodeJS.ProcessEnv;
    expect(buildVersionPayload(env)).toEqual({
      service: "paysave-web",
      releaseVersion: "0.1.0-beta.1",
      sourceRevision: "a".repeat(40),
      buildTime: "2026-07-23T00:00:00.000Z",
    });
    const route = await import("./route");
    expect(route.dynamic).toBe("force-dynamic");
    const response = GET();
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
