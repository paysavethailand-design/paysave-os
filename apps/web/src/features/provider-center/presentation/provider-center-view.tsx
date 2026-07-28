import { Badge, Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import type { ProviderCenterModel, ProviderCenterProviderModel } from "../domain/provider-center";

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader>
      <CardContent className="text-3xl font-semibold tracking-tight">{value}</CardContent>
    </Card>
  );
}

function healthVariant(
  health: ProviderCenterProviderModel["health"],
): "success" | "warning" | "neutral" {
  if (health === "HEALTHY") return "success";
  if (health === "DEGRADED") return "warning";
  return "neutral";
}

export function ProviderCenterView({ model }: { readonly model: ProviderCenterModel }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">REGISTRY SNAPSHOT</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Provider Center</h1>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          Registered provider health, connection state, and published capability coverage from the
          sealed registries. Connection status means registry membership, not external service
          reachability. Provider control is intentionally unavailable.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <section aria-labelledby="provider-center-overview-heading" className="space-y-4">
        <h2 id="provider-center-overview-heading" className="text-xl font-semibold">
          Provider Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Registered Providers" value={model.summary.providers} />
          <Metric label="Healthy Providers" value={model.summary.healthyProviders} />
          <Metric label="Supported Capabilities" value={model.summary.supportedCapabilities} />
          <Metric label="Experimental Features" value={model.summary.experimentalCapabilities} />
        </div>
      </section>

      <section aria-labelledby="provider-list-heading" className="space-y-4">
        <div>
          <h2 id="provider-list-heading" className="text-xl font-semibold">
            Provider List
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a registered provider to inspect its read-only detail view.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-layout="provider-grid">
          {model.providers.length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                description="The Provider Registry returned no entries for this snapshot."
                title="No registered providers"
              />
            </div>
          ) : (
            model.providers.map((provider) => (
              <Link
                aria-label={`View ${provider.displayName} provider details`}
                className="focus-visible:ring-ring rounded-xl focus-visible:ring-2 focus-visible:outline-none"
                href={`/infrastructure/providers/${provider.id}` as Route}
                key={provider.id}
              >
                <Card className="h-full transition-colors hover:border-foreground/30">
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold">{provider.displayName}</h3>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {provider.id}
                        </p>
                      </div>
                      <Badge variant={healthVariant(provider.health)}>{provider.health}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground">Connection Status</p>
                      <p className="mt-1 font-medium">{provider.connectionStatus}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Version</p>
                      <p className="mt-1 font-medium">{provider.version}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Supported Capabilities</p>
                      <p className="mt-1 font-medium">{provider.supportedCapabilities.length}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Experimental Features</p>
                      <p className="mt-1 font-medium">{provider.experimentalFeatures.length}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
