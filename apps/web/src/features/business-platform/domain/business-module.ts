import type { BusinessOperationalModuleId } from "./business-platform";

export type BusinessModuleAvailability = "READY" | "UNKNOWN";
export type BusinessMetricTone = "success" | "warning" | "danger" | "info" | "neutral";

export interface BusinessMetric {
  readonly label: string;
  readonly value: number;
  readonly detail: string;
  readonly tone: BusinessMetricTone;
}

export interface BusinessRecord {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly detail: string;
  readonly occurredAt: string | null;
}

export interface BusinessModuleModel {
  readonly moduleId: BusinessOperationalModuleId;
  readonly status: BusinessModuleAvailability;
  readonly publishedAt: string | null;
  readonly source: string;
  readonly title: string;
  readonly description: string;
  readonly message: string;
  readonly metrics: readonly BusinessMetric[];
  readonly records: readonly BusinessRecord[];
}
