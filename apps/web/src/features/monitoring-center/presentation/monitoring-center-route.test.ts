import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const route = new URL("../../../app/infrastructure/monitoring/page.tsx", import.meta.url);

describe("Monitoring Center route boundary", () => {
  it("loads Registry and Monitoring read models through server composition only", async () => {
    const source = await readFile(fileURLToPath(route), "utf8");

    expect(source).toContain("loadMonitoringCenter");
    expect(source).not.toMatch(
      /@paysave\/(infrastructure|observability)|ProviderRegistry|CapabilityRegistry|ProviderExecutor|\.execute\(|\.health\(|\.create\(|\.update\(|\.delete\(/,
    );
  });
});
