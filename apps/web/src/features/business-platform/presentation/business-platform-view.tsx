import type { BusinessPlatformModel } from "../domain/business-platform";
import { BusinessModuleCard } from "./business-module-card";
import { BusinessPageHeader } from "./business-page-header";

export function BusinessPlatformView({ model }: { readonly model: BusinessPlatformModel }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <BusinessPageHeader
          description="Domain-first, read-only Business Platform. Every production view consumes an Application Layer query backed by a repository port and trusted tenant-scoped adapter."
          eyebrow="PAYSAVE Business Platform"
          publishedAt={model.publishedAt}
          status={model.status}
          title="Business Platform"
        />

        <section
          aria-label="Architecture boundary"
          className="rounded-2xl border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
            Application Layer Boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{model.message}</p>
          <p className="mt-3 text-sm font-medium text-foreground">
            Presentation → Application Layer → Domain → Repository Port → Trusted Adapter
          </p>
        </section>

        {model.modules.length > 0 ? (
          <section
            aria-label="Business Platform roadmap"
            className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          >
            {model.modules.map((item) => (
              <BusinessModuleCard item={item} key={item.id} />
            ))}
          </section>
        ) : (
          <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <h2 className="font-semibold text-amber-800 dark:text-amber-200">UNKNOWN</h2>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{model.message}</p>
          </section>
        )}
      </div>
    </main>
  );
}
