import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const layoutPath = fileURLToPath(
  new URL("../../../app/infrastructure/layout.tsx", import.meta.url),
);

describe("Infrastructure Center route layout", () => {
  it("wraps every infrastructure route with the shared module navigation", async () => {
    const source = await readFile(layoutPath, "utf8");

    expect(source).toContain('from "@/features/infrastructure-dashboard"');
    expect(source).toContain("InfrastructureCenterNavigation");
    expect(source).toContain("{children}");
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(/ProviderExecutor|ProviderFactory|\.execute\s*\(/);
  });
});
