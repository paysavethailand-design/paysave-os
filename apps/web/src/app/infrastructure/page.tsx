import type { Metadata } from "next";
import { InfrastructureDashboardView } from "@/features/infrastructure-dashboard";
import { loadInfrastructureDashboard } from "@/features/infrastructure-dashboard/server";

export const metadata: Metadata = {
  title: "Infrastructure Center | PaySave OS",
  description:
    "Read-only provider, environment, capability, health, activity, and alert dashboard.",
};

export default async function InfrastructureDashboardPage() {
  const model = await loadInfrastructureDashboard();
  return <InfrastructureDashboardView model={model} />;
}
