import type { Metadata } from "next";
import { MonitoringCenterView } from "@/features/monitoring-center";
import { loadMonitoringCenter } from "@/features/monitoring-center/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Monitoring Center | PaySave OS",
  description: "Read-only Registry and Monitoring read-model dashboard.",
};

export default async function MonitoringCenterPage() {
  const model = await loadMonitoringCenter();
  return <MonitoringCenterView model={model} />;
}
