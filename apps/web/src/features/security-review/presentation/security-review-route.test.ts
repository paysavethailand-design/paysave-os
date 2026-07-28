import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routeUrl = new URL("../../../app/infrastructure/security-review/page.tsx", import.meta.url);

describe("Security Review route contract", () => {
  it("uses only the feature public API and server composition", () => {
    const source = readFileSync(routeUrl, "utf8");

    expect(source).toContain('from "@/features/security-review"');
    expect(source).toContain('from "@/features/security-review/server"');
    expect(source).toContain("loadSecurityReview()");
    expect(source).toContain("<SecurityReviewView model={model} />");
    expect(source).toContain('export const dynamic = "force-dynamic"');
    expect(source).not.toMatch(/@paysave\/(security|infrastructure|observability)/);
    expect(source).not.toMatch(/ProviderExecutor|\.execute\(|\.initialize\(|\.health\(/);
  });
});
