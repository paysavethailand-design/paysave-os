import type { Metadata } from "next";
import { ProviderCenterView } from "@/features/provider-center";
import { loadProviderCenter } from "@/features/provider-center/server";

export const metadata: Metadata = {
  title: "Provider Center | PaySave OS",
  description: "Read-only Provider Registry and Capability Registry status.",
};

export default async function ProviderCenterPage() {
  const model = await loadProviderCenter();
  return <ProviderCenterView model={model} />;
}
