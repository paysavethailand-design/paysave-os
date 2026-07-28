import { Card, CardContent, EmptyState } from "@paysave/ui";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { MonitoringStatusBadge } from "./monitoring-status-badge";

export function AlertsPanel({ alerts }: { readonly alerts: MonitoringCenterModel["alerts"] }) {
  return (
    <section aria-labelledby="warnings-alerts-heading" className="space-y-4">
      <div>
        <h2 id="warnings-alerts-heading" className="text-xl font-semibold sm:text-2xl">
          Warnings &amp; Alerts
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Derived from the current registry and process metrics snapshot.
        </p>
      </div>
      {alerts.length === 0 ? (
        <EmptyState
          description="No warning or alert records were derived; this is not a live provider health guarantee."
          title="No warnings or alerts in the current snapshot"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex flex-wrap items-center gap-2">
                  <MonitoringStatusBadge status={alert.severity} />
                  <code className="text-xs break-all text-muted-foreground">{alert.code}</code>
                </div>
                <h3 className="font-semibold">{alert.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{alert.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
