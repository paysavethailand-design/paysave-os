import type { BusinessModuleModel } from "../domain/business-module";
import { BusinessPageHeader } from "./business-page-header";

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return (
    new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(value)) + " UTC"
  );
}

/** Shared read-only renderer. All projection and business decisions are completed before this UI. */
export function BusinessModuleView({ model }: { readonly model: BusinessModuleModel }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <BusinessPageHeader
          description={model.description}
          eyebrow="PAYSAVE Business Platform"
          publishedAt={model.publishedAt}
          status={model.status}
          title={model.title}
        />

        <section aria-label="Data source" className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Application Read Model
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{model.message}</p>
          <p className="mt-2 text-sm font-medium text-foreground">Source: {model.source}</p>
        </section>

        {model.status === "UNKNOWN" ? (
          <section
            aria-label="Unavailable module"
            className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5"
          >
            <h2 className="font-semibold text-amber-800 dark:text-amber-200">UNKNOWN</h2>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{model.message}</p>
          </section>
        ) : (
          <>
            <section
              aria-label="Module metrics"
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              {model.metrics.map((item) => (
                <article className="rounded-2xl border border-border bg-card p-5" key={item.label}>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-card-foreground">
                    {formatValue(item.value)}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                </article>
              ))}
            </section>

            <section
              aria-label="Module records"
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold text-card-foreground">Latest visible records</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Read-only, tenant-scoped, and limited to safe projected fields.
                </p>
              </div>
              {model.records.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">
                  No records are currently visible from the authoritative source.
                </p>
              ) : (
                <>
                  <ul className="divide-y divide-border md:hidden" data-record-layout="mobile">
                    {model.records.map((item) => (
                      <li className="space-y-3 p-5" key={item.id}>
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-medium text-foreground">{item.title}</p>
                          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-muted-foreground">{item.detail}</p>
                        <p className="text-xs text-muted-foreground">
                          Occurred: {formatDate(item.occurredAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <div className="hidden overflow-x-auto md:block" data-record-layout="desktop">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-muted/60 text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3 font-medium">Record</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Detail</th>
                          <th className="px-5 py-3 font-medium">Occurred</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {model.records.map((item) => (
                          <tr key={item.id}>
                            <td className="px-5 py-4 font-medium text-foreground">{item.title}</td>
                            <td className="px-5 py-4 text-muted-foreground">{item.status}</td>
                            <td className="px-5 py-4 text-muted-foreground">{item.detail}</td>
                            <td className="px-5 py-4 text-muted-foreground">
                              {formatDate(item.occurredAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
