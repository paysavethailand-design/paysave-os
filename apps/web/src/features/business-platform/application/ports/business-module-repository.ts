import type { BusinessOperationalModuleId } from "../../domain/business-platform";
import type { BusinessMetric, BusinessRecord } from "../../domain/business-module";

export interface BusinessModuleSnapshot {
  readonly moduleId: BusinessOperationalModuleId;
  readonly publishedAt: string;
  readonly source: string;
  readonly title: string;
  readonly description: string;
  readonly metrics: readonly BusinessMetric[];
  readonly records: readonly BusinessRecord[];
}

export interface BusinessModuleRepository {
  loadModule(moduleId: BusinessOperationalModuleId): Promise<BusinessModuleSnapshot>;
}
