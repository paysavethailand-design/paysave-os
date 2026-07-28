import type { BusinessModuleRepository } from "../application/ports/business-module-repository";
import { createTrustedBusinessModuleRepository as createRepository } from "./supabase-business-module-repository";

/** Provider-neutral factory consumed by the server composition root. */
export function createTrustedBusinessModuleRepository(): Promise<BusinessModuleRepository> {
  return createRepository();
}
