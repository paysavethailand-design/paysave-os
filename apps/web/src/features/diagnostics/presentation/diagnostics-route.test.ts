import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const route = new URL("../../../app/infrastructure/diagnostics/page.tsx", import.meta.url);

describe("Diagnostics route boundary", () => {
  it("loads Validator and Read Model outcomes through server composition only", async () => {
    const source = await readFile(fileURLToPath(route), "utf8");

    expect(source).toContain("loadDiagnostics");
    expect(source).not.toMatch(
      /@paysave\/(infrastructure|observability)|ProviderRegistry|CapabilityRegistry|ProviderExecutor|Validator|\.execute\(|\.health\(|\.create\(|\.update\(|\.delete\(/,
    );
  });
});
