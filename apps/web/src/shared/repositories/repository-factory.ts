/**
 * Sprint 11E: Production Repository Factory (DI / Wiring only)
 * 
 * - Production ALWAYS uses Supabase implementations
 * - Mocks ONLY when NODE_ENV=development or USE_MOCK=true
 * 
 * Do not modify Domain, Business Logic, UI, Schema.
 * 
 * Wired repositories:
 * - RecoveryRepository
 * - PartnerRepository
 * - EmployeeRepository
 * - CommissionRepository
 * - NotificationRepository
 * - ReportingRepository
 * - FeedbackRepository
 * - DashboardRepository
 */

export const isMockMode = (): boolean => {
  if (typeof process === "undefined") return false;
  return process.env.NODE_ENV === "development" || process.env.USE_MOCK === "true";
};

// The actual wiring happens in the infrastructure singleton exports
// (updated in mock files to switch to SupabaseRepository when !isMockMode)

// For verification / direct use in DI containers:
export const PRODUCTION_REPOSITORIES = [
  "RecoveryRepository -> SupabaseRecoveryRepository",
  "PartnerRepository -> SupabasePartnerRepository",
  "EmployeeRepository -> SupabaseEmployeeRepository",
  "CommissionRepository -> SupabaseCommissionRepository",
  "NotificationRepository -> SupabaseNotificationRepository",
  "ReportingRepository -> SupabaseReportingRepository",
  "FeedbackRepository -> SupabaseFeedbackRepository",
  "DashboardRepository -> SupabaseDashboardRepository",
] as const;