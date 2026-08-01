export { FrontendDashboardPage } from "./composition";
export { DashboardError } from "./presentation/dashboard-error";
export { DashboardLoading } from "./presentation/dashboard-loading";
// MockLoginForm removed - using real Supabase Auth via @/features/auth
// export { MockLoginForm } from "./presentation/mock-login-form";
export { DashboardShell } from "./presentation/dashboard-shell";
export {
  dashboardPersonas,
  type DashboardPersona,
  isDashboardPersona,
  DASHBOARD_PERSONA_ROLES,
  canAccessDashboard,
} from "./domain/dashboard";
