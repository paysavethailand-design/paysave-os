import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSecurityReviewReadModel } from "@paysave/security";
import { SecurityControlReviewRepository } from "./security-control-review-repository";

const fixedClock = () => new Date("2026-07-27T09:30:00.000Z");

describe("SecurityControlReviewRepository", () => {
  it("projects the pure Security Validator result into a secret-free snapshot", async () => {
    const snapshot = await new SecurityControlReviewRepository(
      createSecurityReviewReadModel,
      undefined,
      fixedClock,
    ).loadSnapshot();

    expect(snapshot.generatedAt).toBe("2026-07-27T09:30:00.000Z");
    expect(snapshot.checks).toHaveLength(5);
    expect(snapshot.checks.every((check) => check.outcome === "valid")).toBe(true);
    expect(snapshot.checks.flatMap((check) => check.findings)).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain("example-sensitive-value");
  });

  it("does not import providers, infrastructure, observability, or execution APIs", () => {
    const source = readFileSync(
      new URL("./security-control-review-repository.ts", import.meta.url),
      "utf8",
    );

    expect(source).toContain('from "@paysave/security"');
    expect(source).not.toMatch(/@paysave\/infrastructure|@paysave\/observability/);
    expect(source).not.toMatch(/ProviderExecutor|\.execute\(|\.initialize\(|\.health\(/);
  });

  it("lets the Application query fail closed when the Security Read Model throws", async () => {
    const repository = new SecurityControlReviewRepository(() => {
      throw new Error("security read model unavailable");
    });

    await expect(repository.loadSnapshot()).rejects.toThrow("security read model unavailable");
  });
});
