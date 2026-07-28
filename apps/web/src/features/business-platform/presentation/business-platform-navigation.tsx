"use client";

import { createElement } from "react";
import { usePathname } from "next/navigation";
import type { BusinessPlatformModule } from "../domain/business-platform";
import { BusinessPlatformNavigationView } from "./business-platform-navigation-view";

export function BusinessPlatformNavigation({
  modules,
}: {
  readonly modules: readonly BusinessPlatformModule[];
}) {
  return createElement(BusinessPlatformNavigationView, { modules, pathname: usePathname() });
}
