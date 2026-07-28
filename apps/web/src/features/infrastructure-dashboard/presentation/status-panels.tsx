import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { InfrastructureDashboardModel } from "../domain/infrastructure-dashboard";

export function ProviderStatus({
  providers,
}: {
  readonly providers: InfrastructureDashboardModel["providers"];
}) {
  return (
    <section aria-labelledby="provider-status-heading" className="space-y-4">
      <h2 className="text-xl font-semibold" id="provider-status-heading">
        Provider Status
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <span className="font-semibold">{provider.name}</span>
              <Badge variant={provider.status === "healthy" ? "success" : "warning"}>
                {provider.status.toUpperCase()}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {provider.supportedCapabilities}
                </p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {provider.experimentalCapabilities}
                </p>
                <p className="text-xs text-muted-foreground">Experimental</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {provider.unsupportedCapabilities}
                </p>
                <p className="text-xs text-muted-foreground">Not supported</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export function EnvironmentStatus({
  environments,
}: {
  readonly environments: InfrastructureDashboardModel["environments"];
}) {
  return (
    <section aria-labelledby="environment-status-heading" className="space-y-4">
      <h2 className="text-xl font-semibold" id="environment-status-heading">
        Environment Status
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {environments.map((environment) => (
          <Card key={environment.id}>
            <CardHeader className="font-semibold">{environment.id}</CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Providers</span>
                <b>{environment.providers}</b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Capabilities</span>
                <b>{environment.allowedCapabilities}</b>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Bindings</span>
                <b>{environment.bindings}</b>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Experimental</span>
                <Badge
                  variant={environment.experimentalStatus === "DISABLED" ? "neutral" : "warning"}
                >
                  {environment.experimentalStatus}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
