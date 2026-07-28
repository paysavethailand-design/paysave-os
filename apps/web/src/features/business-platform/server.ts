import "server-only";
import type { BusinessOperationalModuleId } from "./domain/business-platform";
import { getBusinessModule } from "./application/queries/get-business-module";
import { getBusinessPlatformOverview } from "./application/queries/get-business-platform-overview";
import { FoundationBusinessPlatformRepository } from "./infrastructure/foundation-business-platform-repository";
import { createTrustedBusinessModuleRepository } from "./infrastructure/trusted-business-module-repository";

/** Server composition root. Routes receive only Application Layer read models. */
export async function loadBusinessPlatformOverview() {
  return getBusinessPlatformOverview(new FoundationBusinessPlatformRepository());
}

export async function loadBusinessModule(moduleId: BusinessOperationalModuleId) {
  try {
    return getBusinessModule(moduleId, await createTrustedBusinessModuleRepository());
  } catch {
    return getBusinessModule(moduleId, {
      loadModule: async () => {
        throw new Error("trusted_repository_unavailable");
      },
    });
  }
}
