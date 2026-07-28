import Link from "next/link";
import type { BusinessPlatformModule } from "../domain/business-platform";
import { businessModuleHref } from "../domain/business-module-routes";

export function BusinessPlatformNavigationView({
  modules,
  pathname,
}: {
  readonly modules: readonly BusinessPlatformModule[];
  readonly pathname: string;
}) {
  return (
    <nav
      aria-label="Business Platform modules"
      className="border-b border-border bg-background/95 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto pb-1">
        {modules.map((item) => {
          const href = businessModuleHref(item.id);
          const current = pathname === href;
          const className = current
            ? "focus-visible:ring-ring shrink-0 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:outline-none"
            : "focus-visible:ring-ring shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:outline-none";
          return item.status === "READY" ? (
            <Link
              aria-current={current ? "page" : undefined}
              className={className}
              href={href}
              key={item.id}
              prefetch={false}
            >
              {item.title}
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="shrink-0 rounded-full border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground"
              key={item.id}
            >
              {item.title} · {item.status}
            </span>
          );
        })}
      </div>
    </nav>
  );
}
