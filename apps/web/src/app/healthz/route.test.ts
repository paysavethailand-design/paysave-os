import { describe, expect, it } from "vitest";
import { GET } from "./route";
import { buildHealthzPayload } from "./health";

describe("GET /healthz", () => {
  it("returns process liveness without dependency calls", async () => {
    expect(buildHealthzPayload("2026-07-23T00:00:00.000Z")).toEqual({
      status: "ok",
      service: "paysave-web",
      timestamp: "2026-07-23T00:00:00.000Z",
    });
    const route = await import("./route");
    expect(route.dynamic).toBe("force-dynamic");
    const response = GET();
    expect(response.status).toBe(200);
    expect((await response.json()).status).toBe("ok");
  });
});
