export type BusinessPlatformModuleId =
  | "foundation"
  | "partner-management"
  | "case-management"
  | "assignment-engine"
  | "workflow-engine"
  | "field-operations"
  | "commission-finance"
  | "executive-dashboard"
  | "business-analytics"
  | "reports"
  | "notifications";

export type BusinessOperationalModuleId = Exclude<BusinessPlatformModuleId, "foundation">;
export type BusinessPlatformModuleStatus = "READY" | "NOT STARTED" | "UNKNOWN";
export type BusinessPlatformStatus = "BUSINESS PLATFORM READY" | "FOUNDATION READY" | "UNKNOWN";

export interface BusinessPlatformModule {
  readonly id: BusinessPlatformModuleId;
  readonly stage: `5.4${"A" | "B" | "C" | "D" | "E" | "F" | "G"}`;
  readonly title: string;
  readonly description: string;
  readonly status: BusinessPlatformModuleStatus;
}

export interface BusinessPlatformModel {
  readonly status: BusinessPlatformStatus;
  readonly publishedAt: string | null;
  readonly message: string;
  readonly modules: readonly BusinessPlatformModule[];
}
