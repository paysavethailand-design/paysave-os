import type { BusinessPlatformModel } from "../../domain/business-platform";
import { validateBusinessPlatformSnapshot } from "../../domain/business-platform-validation";
import type { BusinessPlatformRepository } from "../ports/business-platform-repository";

function unknownModel(message: string): BusinessPlatformModel {
  return Object.freeze({
    status: "UNKNOWN",
    publishedAt: null,
    message,
    modules: Object.freeze([]),
  });
}

/** Produces the immutable complete Business Platform catalog through its read-only port. */
export async function getBusinessPlatformOverview(
  repository: BusinessPlatformRepository,
): Promise<BusinessPlatformModel> {
  try {
    const snapshot = await repository.loadSnapshot();
    const validation = validateBusinessPlatformSnapshot(snapshot);
    if (!validation.valid) {
      return unknownModel(`Snapshot validation failed: ${validation.reason ?? "unknown reason"}.`);
    }
    return Object.freeze({
      status: "BUSINESS PLATFORM READY" as const,
      publishedAt: snapshot.publishedAt,
      message:
        "All Stage 5.4 modules expose tenant-scoped read models through Application Layer repository ports and trusted adapters.",
      modules: Object.freeze(
        snapshot.modules.map((item) => Object.freeze({ ...item, status: "READY" as const })),
      ),
    });
  } catch {
    return unknownModel("Business Platform repository is unavailable.");
  }
}
