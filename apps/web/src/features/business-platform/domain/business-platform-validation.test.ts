import { describe, expect, it } from "vitest";
import type { BusinessPlatformSnapshot } from "../application/ports/business-platform-repository";
import { validateBusinessPlatformSnapshot } from "./business-platform-validation";

const moduleCatalog = [
  ["foundation", "5.4A"],
  ["partner-management", "5.4B"],
  ["case-management", "5.4C"],
  ["assignment-engine", "5.4D"],
  ["workflow-engine", "5.4E"],
  ["field-operations", "5.4F"],
  ["commission-finance", "5.4G"],
  ["executive-dashboard", "5.4G"],
  ["business-analytics", "5.4G"],
  ["reports", "5.4G"],
  ["notifications", "5.4G"],
] as const;

const modules: BusinessPlatformSnapshot["modules"] = moduleCatalog.map(([id, stage]) => ({
  id,
  stage,
  title: id,
  description: `${id} module`,
  status: "READY",
}));

function validate(snapshot: Partial<BusinessPlatformSnapshot>) {
  return validateBusinessPlatformSnapshot({
    publishedAt: "2026-07-28T00:00:00.000Z",
    modules,
    ...snapshot,
  });
}

describe("validateBusinessPlatformSnapshot", () => {
  it("accepts the complete ordered Stage 5.4 snapshot", () => {
    expect(validate({})).toEqual({ valid: true, reason: null });
  });
  it("rejects a malformed publication timestamp", () => {
    expect(validate({ publishedAt: "not-a-date" })).toEqual({
      valid: false,
      reason: "publishedAt must be an ISO timestamp",
    });
  });
  it("rejects a missing module", () => {
    expect(validate({ modules: modules.slice(1) }).valid).toBe(false);
  });
  it("rejects a completed module that is not READY", () => {
    const changed = modules.map((item, index) =>
      index === 1 ? { ...item, status: "NOT_STARTED" as const } : item,
    );
    expect(validate({ modules: changed }).reason).toContain("not READY");
  });
  it("rejects duplicate or reordered module identifiers", () => {
    const changed = [...modules];
    changed[1] = modules[0]!;
    expect(validate({ modules: changed }).valid).toBe(false);
  });
});
