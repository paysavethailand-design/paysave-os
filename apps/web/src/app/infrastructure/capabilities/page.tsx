import type { Metadata } from "next";
import { CapabilityExplorerView } from "@/features/capability-explorer";
import { loadCapabilityExplorer } from "@/features/capability-explorer/server";

export const metadata: Metadata = {
  title: "Capability Explorer | PaySave OS",
  description: "Read-only Capability Registry explorer and provider matrix.",
};

export default async function CapabilityExplorerPage() {
  const model = await loadCapabilityExplorer();
  return <CapabilityExplorerView model={model} />;
}
