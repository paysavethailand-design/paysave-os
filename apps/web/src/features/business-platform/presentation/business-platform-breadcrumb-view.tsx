import type { Route } from "next";
import Link from "next/link";
import type { BusinessPlatformModule } from "../domain/business-platform";
import { businessModuleFromSlug } from "../domain/business-module-routes";

interface BusinessPlatformBreadcrumbViewProps {
  readonly modules: readonly BusinessPlatformModule[];
  readonly pathname: string;
}

/** Pure breadcrumb view driven by the canonical Business module catalog and current pathname. */
export function BusinessPlatformBreadcrumbView({
  modules,
  pathname,
}: BusinessPlatformBreadcrumbViewProps) {
  const segments = pathname.split("/").filter(Boolean);
  const moduleId =
    segments[0] === "business" && segments[1] ? businessModuleFromSlug(segments[1]) : null;
  const activeModule = moduleId ? modules.find((module) => module.id === moduleId) : undefined;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link className="hover:text-foreground" href={"/" as Route}>
            Home
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        {activeModule ? (
          <>
            <li>
              <Link className="hover:text-foreground" href={"/business" as Route}>
                Business Platform
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="font-medium text-foreground">
              {activeModule.title}
            </li>
          </>
        ) : (
          <li aria-current="page" className="font-medium text-foreground">
            Business Platform
          </li>
        )}
      </ol>
    </nav>
  );
}
