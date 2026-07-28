/** Browser-safe public API for the complete Business Platform. */
export type {
  BusinessOperationalModuleId,
  BusinessPlatformModel,
  BusinessPlatformModule,
  BusinessPlatformModuleId,
  BusinessPlatformModuleStatus,
  BusinessPlatformStatus,
} from "./domain/business-platform";
export type {
  BusinessMetric,
  BusinessModuleAvailability,
  BusinessModuleModel,
  BusinessRecord,
} from "./domain/business-module";
export {
  businessModuleFromSlug,
  businessModuleHref,
  businessModuleRoutes,
} from "./domain/business-module-routes";
export { BusinessPlatformBreadcrumb } from "./presentation/business-platform-breadcrumb";
export { BusinessModuleCard } from "./presentation/business-module-card";
export { BusinessModuleView } from "./presentation/business-module-view";
export { BusinessPageHeader } from "./presentation/business-page-header";
export { BusinessPlatformNavigation } from "./presentation/business-platform-navigation";
export { BusinessPlatformView } from "./presentation/business-platform-view";
