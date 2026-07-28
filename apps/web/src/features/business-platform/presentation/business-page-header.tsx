import type { BusinessPlatformStatus } from "../domain/business-platform";
import type { BusinessModuleAvailability } from "../domain/business-module";

function formatPublishedAt(value: string): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));

  return `${formatted} UTC`;
}

interface BusinessPageHeaderProps {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly status: BusinessPlatformStatus | BusinessModuleAvailability;
  readonly publishedAt: string | null;
}

/** Shared read-only heading for Business Platform pages. */
export function BusinessPageHeader({
  eyebrow,
  title,
  description,
  status,
  publishedAt,
}: BusinessPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-1 text-left sm:text-right">
        <p className="text-sm font-semibold text-foreground">{status}</p>
        <p className="text-xs text-muted-foreground">
          Published{" "}
          {publishedAt ? (
            <time dateTime={publishedAt}>{formatPublishedAt(publishedAt)}</time>
          ) : (
            "UNKNOWN"
          )}
        </p>
      </div>
    </header>
  );
}
