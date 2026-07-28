"use client";

import { usePathname } from "next/navigation";
import type { BusinessPlatformModule } from "../domain/business-platform";
import { BusinessPlatformBreadcrumbView } from "./business-platform-breadcrumb-view";

/** Runtime pathname wrapper for the Business Platform breadcrumb. */
export function BusinessPlatformBreadcrumb({
  modules,
}: {
  readonly modules: readonly BusinessPlatformModule[];
}) {
  return <BusinessPlatformBreadcrumbView modules={modules} pathname={usePathname()} />;
}
