import type { BusinessPlatformModule } from "../domain/business-platform";

const statusStyles: Readonly<Record<BusinessPlatformModule["status"], string>> = {
  READY: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "NOT STARTED": "border-border bg-muted text-muted-foreground",
  UNKNOWN: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

/** Shared immutable module summary card for current and future Business Platform pages. */
export function BusinessModuleCard({ item }: { readonly item: BusinessPlatformModule }) {
  return (
    <article
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      data-business-module={item.id}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Stage {item.stage}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-card-foreground">{item.title}</h2>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[item.status]}`}
        >
          {item.status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
    </article>
  );
}
