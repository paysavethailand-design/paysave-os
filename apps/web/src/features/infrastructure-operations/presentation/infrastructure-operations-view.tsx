import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { InfrastructureOperationsModel } from "../domain/infrastructure-operations";
import { ResourceOverview } from "./resource-overview";

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader>
      <CardContent className="text-3xl font-semibold tracking-tight">{value}</CardContent>
    </Card>
  );
}

export function InfrastructureOperationsView({
  model,
}: {
  readonly model: InfrastructureOperationsModel;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">PROVIDER + CAPABILITY REGISTRIES</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Infrastructure Operations
          </h1>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only registry capability coverage. This page does not show live resource state, probe
          providers, or create, update, delete, execute, restart, restore, dispatch, or invoke any
          resource operation.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <section aria-labelledby="operations-overview-heading" className="space-y-4">
        <h2 id="operations-overview-heading" className="text-xl font-semibold">
          Operations Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Metric label="Domains" value={model.summary.domains} />
          <Metric label="Providers" value={model.summary.providers} />
          <Metric label="Capabilities" value={model.summary.publishedCapabilities} />
          <Metric label="Supported" value={model.summary.supportedCells} />
          <Metric label="Partial" value={model.summary.partialCells} />
          <Metric label="Not Supported" value={model.summary.unsupportedCells} />
          <Metric label="Experimental" value={model.summary.experimentalCells} />
        </div>
      </section>

      <div className="space-y-12">
        {model.domains.map((domain) => (
          <ResourceOverview domain={domain} key={domain.id} />
        ))}
      </div>

      <footer className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        EXPERIMENTAL entries are informational and read-only. NOT SUPPORTED includes missing and
        fail-closed registry states. No resource action is available from this page.
      </footer>
    </main>
  );
}
