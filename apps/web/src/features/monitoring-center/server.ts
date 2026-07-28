import "server-only";
import { getMonitoringCenter } from "./application/queries/get-monitoring-center";
import { Stage52MonitoringCenterRepository } from "./infrastructure/stage52-monitoring-center-repository";

export async function loadMonitoringCenter() {
  return getMonitoringCenter(new Stage52MonitoringCenterRepository());
}
