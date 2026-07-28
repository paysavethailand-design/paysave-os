import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const listRoute = fileURLToPath(
  new URL("../../../app/infrastructure/providers/page.tsx", import.meta.url),
);
const detailRoute = fileURLToPath(
  new URL("../../../app/infrastructure/providers/[providerId]/page.tsx", import.meta.url),
);

describe("Provider Center route boundaries", () => {
  it("routes list and detail through feature composition without provider imports", async () => {
    const source = `${await readFile(listRoute, "utf8")}\n${await readFile(detailRoute, "utf8")}`;

    expect(source).toContain("loadProviderCenter");
    expect(source).toContain("ProviderCenterView");
    expect(source).toContain("ProviderDetailView");
    expect(source).toContain("generateStaticParams");
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(/ProviderFactory|ProviderExecutor|\.execute\(/);
  });
});
