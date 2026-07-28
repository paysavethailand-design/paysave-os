import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("GET /metrics", () => {
  it("returns Prometheus text exposition", async () => {
    const route = await import("./route");
    expect(route.dynamic).toBe("force-dynamic");
    const response = GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toContain("paysave_process_uptime_seconds");
  });
});
