import { Badge, Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { InfrastructureDashboardModel } from "../domain/infrastructure-dashboard";

export function RecentActivities({
  activities,
}: {
  readonly activities: InfrastructureDashboardModel["activities"];
}) {
  return (
    <section aria-labelledby="recent-activities-heading" className="space-y-4">
      <h2 className="text-xl font-semibold" id="recent-activities-heading">
        Recent Activities
      </h2>
      {activities.length === 0 ? (
        <EmptyState
          description="No provider execution has been recorded for this read-only dashboard session."
          title="No recent infrastructure activities"
        />
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{activity.capabilityId}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.providerId} · {activity.environment} · {activity.stage}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={activity.outcome === "SUCCEEDED" ? "success" : "warning"}>
                    {activity.outcome}
                  </Badge>
                  <time className="text-xs text-muted-foreground">{activity.occurredAt}</time>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function AlertsWarnings({
  alerts,
}: {
  readonly alerts: InfrastructureDashboardModel["alerts"];
}) {
  return (
    <section aria-labelledby="alerts-warnings-heading" className="space-y-4">
      <h2 className="text-xl font-semibold" id="alerts-warnings-heading">
        Alerts &amp; Warnings
      </h2>
      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No active infrastructure warnings.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {alerts.map((alert) => (
            <Card key={alert.id}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <span className="font-semibold">{alert.title}</span>
                <Badge variant={alert.severity === "warning" ? "warning" : "neutral"}>
                  {alert.code}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{alert.detail}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
