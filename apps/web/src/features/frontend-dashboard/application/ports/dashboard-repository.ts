import type { DashboardModel, DashboardPersona } from "../../domain/dashboard";
export interface DashboardRepository {
  getDashboard(persona: DashboardPersona): Promise<DashboardModel>;
}
