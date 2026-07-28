import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const pagePath = fileURLToPath(new URL("../../../app/business/page.tsx", import.meta.url));
const modulePagePath = fileURLToPath(
  new URL("../../../app/business/[module]/page.tsx", import.meta.url),
);
const layoutPath = fileURLToPath(new URL("../../../app/business/layout.tsx", import.meta.url));
const serverPath = fileURLToPath(new URL("../server.ts", import.meta.url));
const indexPath = fileURLToPath(new URL("../index.ts", import.meta.url));
const forbidden =
  /@paysave\/infrastructure|@\/shared\/providers|supabase|postgres|databaseProvider|fetch\s*\(|ProviderExecutor|\.execute\s*\(/i;

describe("Business Platform route composition", () => {
  it("routes consume only server Application services and browser-safe presentation APIs", async () => {
    const [page, modulePage, layout] = await Promise.all([
      readFile(pagePath, "utf8"),
      readFile(modulePagePath, "utf8"),
      readFile(layoutPath, "utf8"),
    ]);
    expect(page).toContain("loadBusinessPlatformOverview");
    expect(modulePage).toContain("loadBusinessModule");
    expect(modulePage).toContain("BusinessModuleView");
    expect(modulePage).toContain('dynamic = "force-dynamic"');
    expect(modulePage).not.toContain("generateStaticParams");
    expect(layout).toContain("BusinessPlatformNavigation");
    expect(layout).toContain("BusinessPlatformBreadcrumb");
    expect(layout).toContain("PAYSAVE home");
    expect(layout).toContain("{children}");
    expect(`${page}\n${modulePage}\n${layout}`).not.toMatch(forbidden);
  });

  it("keeps trusted adapter construction inside a provider-neutral server-only composition root", async () => {
    const source = await readFile(serverPath, "utf8");
    expect(source).toContain('import "server-only"');
    expect(source).toContain("getBusinessPlatformOverview");
    expect(source).toContain("getBusinessModule");
    expect(source).toContain("createTrustedBusinessModuleRepository");
    expect(source).not.toMatch(forbidden);
  });

  it("keeps infrastructure exports out of the browser-safe public API", async () => {
    const source = await readFile(indexPath, "utf8");
    expect(source).toContain("BusinessPlatformNavigation");
    expect(source).toContain("BusinessModuleView");
    expect(source).not.toMatch(/infrastructure|Repository|loadBusinessPlatformOverview/);
  });
});
