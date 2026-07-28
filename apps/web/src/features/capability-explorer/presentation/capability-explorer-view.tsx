import { Badge, Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import type { CapabilityExplorerModel } from "../domain/capability-explorer";
import { CapabilityMatrix } from "./capability-matrix";
import { CapabilityStatusBadge } from "./capability-status-badge";

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader>
      <CardContent className="text-3xl font-semibold tracking-tight">{value}</CardContent>
    </Card>
  );
}

export function CapabilityExplorerView({ model }: { readonly model: CapabilityExplorerModel }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">CAPABILITY REGISTRY</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Capability Explorer</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only capability coverage published by the Capability Registry. Missing and
          fail-closed states are shown as NOT SUPPORTED; experimental entries are informational
          only.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <section aria-labelledby="capability-summary-heading" className="space-y-4">
        <h2 id="capability-summary-heading" className="text-xl font-semibold">
          Capability Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          <Metric label="Capabilities" value={model.summary.capabilities} />
          <Metric label="Categories" value={model.summary.categories} />
          <Metric label="Providers" value={model.summary.providers} />
          <Metric label="Supported" value={model.summary.supportedCells} />
          <Metric label="Partial" value={model.summary.partialCells} />
          <Metric label="Not Supported" value={model.summary.unsupportedCells} />
          <Metric label="Experimental" value={model.summary.experimentalCells} />
        </div>
      </section>

      <section aria-labelledby="capability-categories-heading" className="space-y-4">
        <h2 id="capability-categories-heading" className="text-xl font-semibold">
          Capability Categories
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {model.categories.map((category) => (
            <Card key={category.name}>
              <CardContent className="flex items-center justify-between gap-3 py-5">
                <span className="font-medium capitalize">{category.name}</span>
                <Badge variant="neutral">{category.capabilities}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="capability-list-heading" className="space-y-4">
        <div>
          <h2 id="capability-list-heading" className="text-xl font-semibold">
            Capability List
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a capability to inspect its provider-by-provider registry status.
          </p>
        </div>
        {model.capabilities.length === 0 ? (
          <EmptyState
            description="The Capability Registry returned no capability candidates."
            title="No registered capabilities"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {model.capabilities.map((capability) => (
              <Link
                aria-label={`View ${capability.id} capability details`}
                className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                href={`/infrastructure/capabilities/${capability.id}` as Route}
                prefetch={false}
                key={capability.id}
              >
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader className="space-y-2">
                    <h3 className="font-mono text-sm font-semibold break-words">{capability.id}</h3>
                    <p className="text-xs text-muted-foreground capitalize">
                      {capability.category}
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {(["SUPPORTED", "PARTIAL", "NOT SUPPORTED", "EXPERIMENTAL"] as const).map(
                      (state) =>
                        capability.counts[state] > 0 ? (
                          <span className="inline-flex items-center gap-1" key={state}>
                            <CapabilityStatusBadge availability={state} />
                            <span className="text-xs text-muted-foreground">
                              {capability.counts[state]}
                            </span>
                          </span>
                        ) : null,
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="provider-capability-matrix-heading" className="space-y-4">
        <div>
          <h2 id="provider-capability-matrix-heading" className="text-xl font-semibold">
            Provider Capability Matrix
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Registry-only comparison. No provider action is available from this matrix.
          </p>
        </div>
        <CapabilityMatrix model={model} />
      </section>
    </main>
  );
}
