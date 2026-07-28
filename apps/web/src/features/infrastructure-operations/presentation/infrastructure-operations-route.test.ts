import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const route = new URL("../../../app/infrastructure/operations/page.tsx", import.meta.url);

describe("Infrastructure Operations route boundary", () => {
  it("loads the read model through feature server composition only", async () => {
    const source = await readFile(fileURLToPath(route), "utf8");

    expect(source).toContain("loadInfrastructureOperations");
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(
      /ProviderRegistry|CapabilityRegistry|ProviderExecutor|\.execute\(|\.create\(|\.update\(|\.delete\(/,
    );
  });
});
