import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routes = [
  new URL("../../../app/infrastructure/capabilities/page.tsx", import.meta.url),
  new URL("../../../app/infrastructure/capabilities/[capabilityId]/page.tsx", import.meta.url),
];

describe("Capability Explorer route boundary", () => {
  it("loads list and detail through feature server composition only", async () => {
    const source = (
      await Promise.all(routes.map((url) => readFile(fileURLToPath(url), "utf8")))
    ).join("\n");

    expect(source).toContain("loadCapabilityExplorer");
    expect(source).toContain("loadCapabilityDetails");
    expect(source).toContain("generateStaticParams");
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(
      /CapabilityRegistry|createGitHubProvider|ProviderExecutor|\.execute\(/,
    );
  });
});
