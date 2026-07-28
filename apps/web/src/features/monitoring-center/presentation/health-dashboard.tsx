import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { MonitoringStatusBadge } from "./monitoring-status-badge";

export function HealthDashboard({ model }: { readonly model: MonitoringCenterModel }) {
  return (
    <div className="space-y-10">
      <section aria-labelledby="infrastructure-health-heading" className="space-y-4">
        <h2 id="infrastructure-health-heading" className="text-xl font-semibold sm:text-2xl">
          Infrastructure Health
        </h2>
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{model.infrastructureHealth.label}</h3>
            <MonitoringStatusBadge status={model.infrastructureHealth.status} />
          </CardHeader>
          <CardContent className="text-sm leading-6 text-muted-foreground">
            {model.infrastructureHealth.detail}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="provider-health-heading" className="space-y-4">
        <h2 id="provider-health-heading" className="text-xl font-semibold sm:text-2xl">
          Provider Health
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Monitoring read-model status only. Registry membership does not prove provider
          reachability.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {model.providerHealth.map((provider) => (
            <Card key={provider.id}>
              <CardHeader className="flex-row items-center justify-between gap-2">
                <h3 className="font-semibold capitalize">{provider.id}</h3>
                <MonitoringStatusBadge status={provider.status} />
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {provider.detail}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="registry-health-heading" className="space-y-4">
        <h2 id="registry-health-heading" className="text-xl font-semibold sm:text-2xl">
          Registry Health
        </h2>
        <Card>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Registry integrity</h3>
              <p className="mt-1 text-sm text-muted-foreground">{model.registryHealth.detail}</p>
            </div>
            <MonitoringStatusBadge status={model.registryHealth.status} />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="neutral">{model.registryHealth.providers} PROVIDERS</Badge>
            <Badge variant="neutral">{model.registryHealth.capabilities} CAPABILITIES</Badge>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="environment-status-heading" className="space-y-4">
        <h2 id="environment-status-heading" className="text-xl font-semibold sm:text-2xl">
          Environment Status
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Configuration snapshot only; no environment or provider is contacted.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {model.environmentStatus.map((environment) => (
            <Card key={environment.id}>
              <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold capitalize">{environment.id}</h3>
                <MonitoringStatusBadge status={environment.status} />
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>{environment.providers} registered providers</p>
                <p>{environment.capabilities} allowed capabilities</p>
                <p>{environment.bindings} configured bindings</p>
                <p>Experimental: {environment.experimental}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
