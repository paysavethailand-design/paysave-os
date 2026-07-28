import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import type { CapabilityExplorerItemModel } from "../domain/capability-explorer";
import { CapabilityStatusBadge } from "./capability-status-badge";

export function CapabilityDetailView({
  capability,
  providers,
}: {
  readonly capability: CapabilityExplorerItemModel;
  readonly providers: readonly string[];
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-4">
        <Link
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          href={"/infrastructure/capabilities" as Route}
        >
          ← Capability Explorer
        </Link>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Capability Detail</Badge>
          <Badge variant="success">READ ONLY</Badge>
        </div>
        <div>
          <h1 className="font-mono text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {capability.id}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground capitalize">
            Category: {capability.category}
          </p>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Provider availability from the Capability Registry. Missing and fail-closed entries
          display NOT SUPPORTED. EXPERIMENTAL is read-only and cannot be started from this view.
        </p>
      </header>

      <section aria-labelledby="capability-provider-status-heading" className="space-y-4">
        <h2 id="capability-provider-status-heading" className="text-xl font-semibold">
          Provider Capability Status
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((providerId) => {
            const provider = capability.providers.find((item) => item.providerId === providerId)!;
            return (
              <Card key={providerId}>
                <CardHeader className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold capitalize">{provider.providerId}</h3>
                    <CapabilityStatusBadge availability={provider.availability} />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Plane</p>
                    <p className="mt-1 font-medium">{provider.plane ?? "NOT PUBLISHED"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Access</p>
                    <p className="mt-1 font-medium">{provider.access ?? "NOT PUBLISHED"}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="capability-status-summary-heading" className="space-y-4">
        <h2 id="capability-status-summary-heading" className="text-xl font-semibold">
          Capability Status Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(["SUPPORTED", "PARTIAL", "NOT SUPPORTED", "EXPERIMENTAL"] as const).map((state) => (
            <Card key={state}>
              <CardHeader className="pb-2">
                <CapabilityStatusBadge availability={state} />
              </CardHeader>
              <CardContent className="text-3xl font-semibold">
                {capability.counts[state]}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
