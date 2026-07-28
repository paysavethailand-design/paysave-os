import { Badge, Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import type {
  ProviderCenterCapabilityModel,
  ProviderCenterProviderModel,
} from "../domain/provider-center";

function CapabilityCards({
  capabilities,
  emptyCopy,
}: {
  readonly capabilities: readonly ProviderCenterCapabilityModel[];
  readonly emptyCopy: string;
}) {
  if (capabilities.length === 0) {
    return <EmptyState description={emptyCopy} title="No published entries" />;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {capabilities.map((capability) => (
        <Card key={capability.id}>
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-mono text-sm font-semibold">{capability.id}</h3>
              <Badge variant={capability.availability === "SUPPORTED" ? "success" : "warning"}>
                {capability.availability}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="mt-1 font-medium">{capability.category}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plane</p>
              <p className="mt-1 font-medium">{capability.plane}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Access</p>
              <p className="mt-1 font-medium">{capability.access}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ProviderDetailView({
  provider,
}: {
  readonly provider: ProviderCenterProviderModel;
}) {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"
      data-layout="provider-detail"
    >
      <header className="space-y-4">
        <Link
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
          href={"/infrastructure/providers" as Route}
        >
          ← Provider Center
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="neutral">Provider Details</Badge>
          <Badge variant="success">{provider.connectionStatus}</Badge>
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {provider.displayName}
          </h1>
          <p className="mt-2 font-mono text-sm text-muted-foreground">{provider.id}</p>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
          Read-only registry metadata. Experimental entries remain disabled and no provider control
          is available from this view. Connection status reflects registry membership rather than an
          authenticated external connectivity check.
        </p>
      </header>

      <section aria-labelledby="provider-details-heading" className="space-y-4">
        <h2 id="provider-details-heading" className="text-xl font-semibold">
          Provider Details
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="text-sm text-muted-foreground">Health Status</CardHeader>
            <CardContent>
              <Badge variant={provider.health === "HEALTHY" ? "success" : "warning"}>
                {provider.health}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="text-sm text-muted-foreground">Connection Status</CardHeader>
            <CardContent className="font-semibold">{provider.connectionStatus}</CardContent>
          </Card>
          <Card>
            <CardHeader className="text-sm text-muted-foreground">Version</CardHeader>
            <CardContent className="font-semibold">{provider.version}</CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="supported-capabilities-heading" className="space-y-4">
        <div>
          <h2 id="supported-capabilities-heading" className="text-xl font-semibold">
            Supported Capabilities
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Supported and partial entries published for this provider.
          </p>
        </div>
        <CapabilityCards
          capabilities={provider.supportedCapabilities}
          emptyCopy="The Capability Registry has no supported entries for this provider."
        />
      </section>

      <section aria-labelledby="experimental-features-heading" className="space-y-4">
        <div>
          <h2 id="experimental-features-heading" className="text-xl font-semibold">
            Experimental Features
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every experimental entry is marked EXPERIMENTAL DISABLED and has no action control.
          </p>
        </div>
        <CapabilityCards
          capabilities={provider.experimentalFeatures}
          emptyCopy="The Capability Registry has no experimental entries for this provider."
        />
      </section>
    </main>
  );
}
