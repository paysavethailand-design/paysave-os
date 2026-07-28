import type { BusinessOperationalModuleId } from "../../domain/business-platform";
import type { BusinessModuleModel } from "../../domain/business-module";
import { validateBusinessModuleSnapshot } from "../../domain/business-module-validation";
import type { BusinessModuleRepository } from "../ports/business-module-repository";

function unknownModel(moduleId: BusinessOperationalModuleId, message: string): BusinessModuleModel {
  return Object.freeze({
    moduleId,
    status: "UNKNOWN",
    publishedAt: null,
    source: "unavailable",
    title: "Business module unavailable",
    description: "The authoritative read model could not be loaded.",
    message,
    metrics: Object.freeze([]),
    records: Object.freeze([]),
  });
}

export async function getBusinessModule(
  moduleId: BusinessOperationalModuleId,
  repository: BusinessModuleRepository,
): Promise<BusinessModuleModel> {
  try {
    const snapshot = await repository.loadModule(moduleId);
    const validation = validateBusinessModuleSnapshot(moduleId, snapshot);
    if (!validation.valid) {
      return unknownModel(moduleId, `Snapshot validation failed: ${validation.reason}.`);
    }
    return Object.freeze({
      ...snapshot,
      status: "READY" as const,
      message:
        snapshot.records.length === 0
          ? "The authoritative source is available and currently contains no visible records."
          : "Authoritative tenant-scoped data loaded through the Application Layer.",
      metrics: Object.freeze(snapshot.metrics.map((metric) => Object.freeze({ ...metric }))),
      records: Object.freeze(snapshot.records.map((record) => Object.freeze({ ...record }))),
    });
  } catch {
    return unknownModel(moduleId, "The trusted repository is unavailable; status is UNKNOWN.");
  }
}
