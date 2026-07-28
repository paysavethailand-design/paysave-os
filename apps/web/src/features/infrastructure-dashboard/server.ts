import { getInfrastructureDashboard } from "./application/queries/get-infrastructure-dashboard";
import { Stage52InfrastructureDashboardRepository } from "./infrastructure/stage52-infrastructure-dashboard-repository";

/** Server composition root. The route receives only the Application Layer read model. */
export async function loadInfrastructureDashboard() {
  return getInfrastructureDashboard(new Stage52InfrastructureDashboardRepository());
}
