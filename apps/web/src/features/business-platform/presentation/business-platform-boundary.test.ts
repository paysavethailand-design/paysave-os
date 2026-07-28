import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const paths = {
  query: fileURLToPath(
    new URL("../application/queries/get-business-platform-overview.ts", import.meta.url),
  ),
  port: fileURLToPath(
    new URL("../application/ports/business-platform-repository.ts", import.meta.url),
  ),
  adapter: fileURLToPath(
    new URL("../infrastructure/foundation-business-platform-repository.ts", import.meta.url),
  ),
  view: fileURLToPath(new URL("./business-platform-view.tsx", import.meta.url)),
  navigation: fileURLToPath(new URL("./business-platform-navigation.tsx", import.meta.url)),
};

const directAccess =
  /@paysave\/infrastructure|@\/shared\/providers|supabase|postgres|databaseProvider|fetch\s*\(|ProviderExecutor/i;

describe("Business Platform architecture boundary", () => {
  it("keeps presentation and application free of direct platform access", async () => {
    const [query, view, navigation] = await Promise.all([
      readFile(paths.query, "utf8"),
      readFile(paths.view, "utf8"),
      readFile(paths.navigation, "utf8"),
    ]);

    expect(`${query}\n${view}\n${navigation}`).not.toMatch(directAccess);
    expect(`${view}\n${navigation}`).not.toMatch(/application\/queries|infrastructure\//);
  });

  it("exposes a read-only port and a trusted metadata-only adapter", async () => {
    const [port, adapter] = await Promise.all([
      readFile(paths.port, "utf8"),
      readFile(paths.adapter, "utf8"),
    ]);

    expect(port).toContain("loadSnapshot()");
    expect(port).not.toMatch(/create\s*\(|update\s*\(|delete\s*\(|execute\s*\(|save\s*\(/);
    expect(adapter).not.toMatch(directAccess);
    expect(adapter).not.toMatch(/secret|token|password|credential|connection string|api[_-]?key/i);
  });
});
