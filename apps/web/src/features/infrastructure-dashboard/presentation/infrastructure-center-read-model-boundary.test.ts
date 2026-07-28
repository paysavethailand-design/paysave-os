import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const adapterPaths = [
  "../infrastructure/stage52-infrastructure-dashboard-repository.ts",
  "../../provider-center/infrastructure/stage52-provider-center-repository.ts",
  "../../capability-explorer/infrastructure/stage52-capability-explorer-repository.ts",
  "../../infrastructure-operations/infrastructure/stage52-infrastructure-operations-repository.ts",
  "../../monitoring-center/infrastructure/stage52-monitoring-center-repository.ts",
  "../../diagnostics/infrastructure/stage52-diagnostics-repository.ts",
] as const;

describe("Infrastructure Center read-model boundary", () => {
  it("keeps every Stage 5.3A-F adapter free of provider construction and lifecycle calls", async () => {
    for (const path of adapterPaths) {
      const source = await readFile(fileURLToPath(new URL(path, import.meta.url)), "utf8");

      expect(source).toContain('from "@paysave/infrastructure/read-models"');
      expect(source).not.toContain('from "@paysave/infrastructure/server"');
      expect(source).not.toMatch(
        /create(?:GitHub|Hostinger|Supabase)Provider|ProviderExecutor|ProviderFactory|\.health\s*\(|\.shutdown\s*\(|\.execute\s*\(|\.bootstrap\s*\(/,
      );
    }
  });
});
