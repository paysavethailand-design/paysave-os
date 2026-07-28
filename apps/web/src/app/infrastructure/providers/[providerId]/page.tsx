import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProviderDetailView } from "@/features/provider-center";
import { loadProviderDetails, providerCenterStaticParams } from "@/features/provider-center/server";

interface PageProps {
  readonly params: Promise<{ providerId: string }>;
}

export async function generateStaticParams() {
  return providerCenterStaticParams();
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { providerId } = await params;
  const provider = await loadProviderDetails(providerId);
  return {
    title: provider ? `${provider.displayName} Provider | PaySave OS` : "Provider Not Found",
  };
}

export default async function ProviderDetailPage({ params }: PageProps) {
  const { providerId } = await params;
  const provider = await loadProviderDetails(providerId);
  if (!provider) notFound();
  return <ProviderDetailView provider={provider} />;
}
