import type { Route } from "next";
import type { BusinessOperationalModuleId, BusinessPlatformModuleId } from "./business-platform";

export const businessModuleRoutes: Readonly<
  Record<BusinessOperationalModuleId, { readonly slug: string; readonly href: Route }>
> = Object.freeze({
  "partner-management": { slug: "partners", href: "/business/partners" as Route },
  "case-management": { slug: "cases", href: "/business/cases" as Route },
  "assignment-engine": { slug: "assignments", href: "/business/assignments" as Route },
  "workflow-engine": { slug: "workflows", href: "/business/workflows" as Route },
  "field-operations": { slug: "field-operations", href: "/business/field-operations" as Route },
  "commission-finance": { slug: "finance", href: "/business/finance" as Route },
  "executive-dashboard": { slug: "dashboard", href: "/business/dashboard" as Route },
  "business-analytics": { slug: "analytics", href: "/business/analytics" as Route },
  reports: { slug: "reports", href: "/business/reports" as Route },
  notifications: { slug: "notifications", href: "/business/notifications" as Route },
});

export function businessModuleFromSlug(slug: string): BusinessOperationalModuleId | null {
  const entry = Object.entries(businessModuleRoutes).find(([, route]) => route.slug === slug);
  return (entry?.[0] as BusinessOperationalModuleId | undefined) ?? null;
}

export function businessModuleHref(moduleId: BusinessPlatformModuleId): Route {
  return moduleId === "foundation" ? ("/business" as Route) : businessModuleRoutes[moduleId].href;
}
