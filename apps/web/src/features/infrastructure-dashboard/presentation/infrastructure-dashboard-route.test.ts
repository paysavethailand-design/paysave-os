import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const routePath = fileURLToPath(new URL("../../../app/infrastructure/page.tsx", import.meta.url));

describe("Infrastructure Dashboard route boundary", () => {
  it("renders the feature through its public UI and server composition APIs", async () => {
    const source = await readFile(routePath, "utf8");
    expect(source).toContain('from "@/features/infrastructure-dashboard"');
    expect(source).toContain('from "@/features/infrastructure-dashboard/server"');
    expect(source).not.toContain("@paysave/infrastructure");
    expect(source).not.toMatch(
      /createHostingerProvider|createSupabaseProvider|createGitHubProvider/,
    );
  });
});
