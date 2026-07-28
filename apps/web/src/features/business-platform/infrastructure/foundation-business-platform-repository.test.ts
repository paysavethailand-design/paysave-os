import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { FoundationBusinessPlatformRepository } from "./foundation-business-platform-repository";

const repositoryPath = fileURLToPath(
  new URL("./foundation-business-platform-repository.ts", import.meta.url),
);
const expectedModuleIds = [
  "foundation",
  "partner-management",
  "case-management",
  "assignment-engine",
  "workflow-engine",
  "field-operations",
  "commission-finance",
  "executive-dashboard",
  "business-analytics",
  "reports",
  "notifications",
] as const;

describe("FoundationBusinessPlatformRepository", () => {
  it("returns a frozen complete Stage 5.4 catalog", async () => {
    const snapshot = await new FoundationBusinessPlatformRepository().loadSnapshot();
    expect(snapshot.modules.map((item) => item.id)).toEqual(expectedModuleIds);
    expect(snapshot.modules.every((item) => item.status === "READY")).toBe(true);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.modules)).toBe(true);
    expect(snapshot.modules.every(Object.isFrozen)).toBe(true);
  });

  it("has no mutation, database, provider, external-service, or secret surface", async () => {
    const repository = new FoundationBusinessPlatformRepository();
    const source = await readFile(repositoryPath, "utf8");
    const serialized = JSON.stringify(await repository.loadSnapshot());
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(repository))).toEqual([
      "constructor",
      "loadSnapshot",
    ]);
    expect(source).not.toMatch(
      /@paysave\/infrastructure|@\/shared\/providers|supabase|postgres|fetch\s*\(|Provider|Database/i,
    );
    expect(serialized).not.toMatch(
      /secret|token|password|credential|connection|string|api[_-]?key/i,
    );
  });
});
