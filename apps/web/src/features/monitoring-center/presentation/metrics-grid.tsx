import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { MonitoringStatusBadge } from "./monitoring-status-badge";

export function MetricsGrid({
  metrics,
}: {
  readonly metrics: MonitoringCenterModel["systemMetrics"];
}) {
  return (
    <section aria-labelledby="system-metrics-heading" className="space-y-4">
      <div>
        <h2 id="system-metrics-heading" className="text-xl font-semibold sm:text-2xl">
          System Metrics
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Process-local Monitoring read model; values reset when the process restarts.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-medium text-muted-foreground">{metric.label}</h3>
              <Badge variant="neutral">{metric.kind}</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tracking-tight">
                {metric.id === "readiness-status" ? (
                  <MonitoringStatusBadge status={metric.value} />
                ) : (
                  metric.value
                )}
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
