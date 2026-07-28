import type { BusinessPlatformSnapshot } from "../application/ports/business-platform-repository";
import type { BusinessPlatformModuleId } from "./business-platform";

export interface BusinessPlatformValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

const expected: ReadonlyArray<
  readonly [BusinessPlatformModuleId, `5.4${"A" | "B" | "C" | "D" | "E" | "F" | "G"}`]
> = [
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
];

/** Pure validation shared by Business Platform Application queries and trusted adapters. */
export function validateBusinessPlatformSnapshot(
  snapshot: BusinessPlatformSnapshot,
): BusinessPlatformValidationResult {
  if (!Number.isFinite(Date.parse(snapshot.publishedAt))) {
    return { valid: false, reason: "publishedAt must be an ISO timestamp" };
  }
  if (snapshot.modules.length !== expected.length) {
    return { valid: false, reason: `expected ${expected.length} modules` };
  }
  const identifiers = new Set<string>();
  for (const [index, candidate] of snapshot.modules.entries()) {
    if (identifiers.has(candidate.id)) {
      return { valid: false, reason: `duplicate module identifier: ${candidate.id}` };
    }
    identifiers.add(candidate.id);
    const required = expected[index];
    if (!required || candidate.id !== required[0] || candidate.stage !== required[1]) {
      return { valid: false, reason: `module order or stage is invalid at index ${index}` };
    }
    if (!candidate.title.trim() || !candidate.description.trim()) {
      return { valid: false, reason: `module copy is incomplete: ${candidate.id}` };
    }
    if (candidate.status !== "READY") {
      return { valid: false, reason: `completed module is not READY: ${candidate.id}` };
    }
  }
  return { valid: true, reason: null };
}
