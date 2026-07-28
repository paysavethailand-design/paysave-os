import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CapabilityDetailView } from "@/features/capability-explorer";
import {
  capabilityExplorerStaticParams,
  loadCapabilityDetails,
  loadCapabilityExplorer,
} from "@/features/capability-explorer/server";

export async function generateStaticParams() {
  return capabilityExplorerStaticParams();
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ capabilityId: string }>;
}): Promise<Metadata> {
  const { capabilityId } = await params;
  return {
    title: `${capabilityId} | Capability Explorer`,
    description: `Read-only Capability Registry detail for ${capabilityId}.`,
  };
}

export default async function CapabilityDetailPage({
  params,
}: {
  readonly params: Promise<{ capabilityId: string }>;
}) {
  const { capabilityId } = await params;
  const [capability, model] = await Promise.all([
    loadCapabilityDetails(capabilityId),
    loadCapabilityExplorer(),
  ]);
  if (!capability) notFound();
  return <CapabilityDetailView capability={capability} providers={model.providers} />;
}
