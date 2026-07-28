import type { Route } from "next";
import Link from "next/link";

const infrastructureCenterModules = [
  { href: "/infrastructure", label: "Overview" },
  { href: "/infrastructure/providers", label: "Providers" },
  { href: "/infrastructure/capabilities", label: "Capabilities" },
  { href: "/infrastructure/operations", label: "Operations" },
  { href: "/infrastructure/monitoring", label: "Monitoring" },
  { href: "/infrastructure/diagnostics", label: "Diagnostics" },
  { href: "/infrastructure/security-review", label: "Security Review" },
] as const;

export function InfrastructureCenterNavigation() {
  return (
    <nav
      aria-label="Infrastructure Center modules"
      className="border-b border-border bg-background/95 px-4 py-3 sm:px-6 lg:px-8"
    >
      <div className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto pb-1">
        {infrastructureCenterModules.map((item) => (
          <Link
            className="focus-visible:ring-ring shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:outline-none"
            href={item.href as Route}
            key={item.href}
            prefetch={false}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
