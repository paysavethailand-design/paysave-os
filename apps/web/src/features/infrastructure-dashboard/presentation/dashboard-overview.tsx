import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { InfrastructureDashboardModel } from "../domain/infrastructure-dashboard";

function Metric({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader>
      <CardContent className="text-3xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

export function DashboardOverview({ model }: { readonly model: InfrastructureDashboardModel }) {
  const healthVariant =
    model.systemHealth.status === "healthy"
      ? "success"
      : model.systemHealth.status === "degraded"
        ? "warning"
        : "danger";
  return (
    <>
      <section aria-labelledby="dashboard-overview-heading" className="space-y-4">
        <h2 className="text-xl font-semibold" id="dashboard-overview-heading">
          Dashboard Overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Providers" value={model.overview.providers} />
          <Metric label="Healthy Providers" value={model.overview.healthyProviders} />
          <Metric label="Environments" value={model.overview.environments} />
          <Metric label="Available Capabilities" value={model.overview.supportedCapabilities} />
        </div>
      </section>
      <section aria-labelledby="system-health-heading" className="space-y-4">
        <h2 className="text-xl font-semibold" id="system-health-heading">
          System Health
        </h2>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold">{model.systemHealth.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{model.systemHealth.detail}</p>
            </div>
            <Badge variant={healthVariant}>{model.systemHealth.status.toUpperCase()}</Badge>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
