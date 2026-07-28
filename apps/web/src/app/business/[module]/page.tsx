import { notFound } from "next/navigation";
import { BusinessModuleView, businessModuleFromSlug } from "@/features/business-platform";
import { loadBusinessModule } from "@/features/business-platform/server";

export const dynamic = "force-dynamic";

export default async function BusinessModulePage({
  params,
}: {
  readonly params: Promise<{ readonly module: string }>;
}) {
  const { module: slug } = await params;
  const moduleId = businessModuleFromSlug(slug);
  if (!moduleId) notFound();
  const model = await loadBusinessModule(moduleId);
  return <BusinessModuleView model={model} />;
}
