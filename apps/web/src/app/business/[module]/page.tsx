import { notFound } from "next/navigation";
import type { PermissionCode } from "@paysave/security";
import { requirePermission } from "@/features/auth/server";
import { BusinessModuleView, businessModuleFromSlug } from "@/features/business-platform";
import type { BusinessOperationalModuleId } from "@/features/business-platform";
import { loadBusinessModule } from "@/features/business-platform/server";

export const dynamic = "force-dynamic";

const moduleAliases: Readonly<Partial<Record<string, BusinessOperationalModuleId>>> = Object.freeze(
  {
    payments: "commission-finance",
    commission: "commission-finance",
  },
);

const modulePermissionPolicies: Readonly<Partial<Record<string, readonly PermissionCode[]>>> =
  Object.freeze({
    reports: ["reports.read"],
    payments: ["payments.read"],
    commission: ["commission.read"],
    finance: ["payments.read", "commission.read"],
  });

export default async function BusinessModulePage({
  params,
}: {
  readonly params: Promise<{ readonly module: string }>;
}) {
  const { module: slug } = await params;
  const moduleId = businessModuleFromSlug(slug) ?? moduleAliases[slug] ?? null;
  if (!moduleId) notFound();
  for (const permission of modulePermissionPolicies[slug] ?? []) {
    await requirePermission(permission, `/business/${slug}`);
  }
  const model = await loadBusinessModule(moduleId);
  return <BusinessModuleView model={model} />;
}
