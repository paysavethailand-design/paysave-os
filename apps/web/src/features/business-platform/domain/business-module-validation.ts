import type { BusinessModuleSnapshot } from "../application/ports/business-module-repository";
import type { BusinessOperationalModuleId } from "./business-platform";

export interface BusinessModuleValidationResult {
  readonly valid: boolean;
  readonly reason: string | null;
}

export function validateBusinessModuleSnapshot(
  requestedModule: BusinessOperationalModuleId,
  snapshot: BusinessModuleSnapshot,
): BusinessModuleValidationResult {
  if (snapshot.moduleId !== requestedModule) {
    return { valid: false, reason: "snapshot module does not match the request" };
  }
  if (!Number.isFinite(Date.parse(snapshot.publishedAt))) {
    return { valid: false, reason: "publishedAt must be an ISO timestamp" };
  }
  if (!snapshot.source.trim() || !snapshot.title.trim() || !snapshot.description.trim()) {
    return { valid: false, reason: "module metadata is incomplete" };
  }
  const recordIds = new Set<string>();
  for (const metric of snapshot.metrics) {
    if (!metric.label.trim() || !metric.detail.trim() || !Number.isFinite(metric.value)) {
      return { valid: false, reason: "metric is invalid" };
    }
  }
  for (const record of snapshot.records) {
    if (recordIds.has(record.id)) return { valid: false, reason: "duplicate record identifier" };
    recordIds.add(record.id);
    if (
      !record.id.trim() ||
      !record.title.trim() ||
      !record.status.trim() ||
      !record.detail.trim()
    ) {
      return { valid: false, reason: "record is invalid" };
    }
    if (record.occurredAt !== null && !Number.isFinite(Date.parse(record.occurredAt))) {
      return { valid: false, reason: "record timestamp is invalid" };
    }
  }
  return { valid: true, reason: null };
}
