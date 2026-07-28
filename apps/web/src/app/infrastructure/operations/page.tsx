import type { Metadata } from "next";
import { InfrastructureOperationsView } from "@/features/infrastructure-operations";
import { loadInfrastructureOperations } from "@/features/infrastructure-operations/server";

export const metadata: Metadata = {
  title: "Infrastructure Operations | PaySave OS",
  description: "Read-only Provider and Capability Registry operations coverage.",
};

export default async function InfrastructureOperationsPage() {
  const model = await loadInfrastructureOperations();
  return <InfrastructureOperationsView model={model} />;
}
