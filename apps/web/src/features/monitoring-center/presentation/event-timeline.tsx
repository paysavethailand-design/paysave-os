import { Card, CardContent, EmptyState } from "@paysave/ui";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { MonitoringStatusBadge } from "./monitoring-status-badge";

export function EventTimeline({
  events,
}: {
  readonly events: MonitoringCenterModel["recentEvents"];
}) {
  return (
    <section aria-labelledby="recent-events-heading" className="space-y-4">
      <div>
        <h2 id="recent-events-heading" className="text-xl font-semibold sm:text-2xl">
          Recent Events
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Read-only events exposed by the current Monitoring read model.
        </p>
      </div>
      {events.length === 0 ? (
        <EmptyState
          description="No event records are available; this does not prove that no external event occurred."
          title="No recent events in the current Monitoring read model"
        />
      ) : (
        <ol className="space-y-4">
          {events.map((event) => (
            <li key={event.id}>
              <Card>
                <CardContent className="space-y-2 pt-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <MonitoringStatusBadge status={event.severity} />
                    <span className="text-xs text-muted-foreground">{event.source}</span>
                    <time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>
                      {new Date(event.occurredAt).toLocaleString("en-GB")}
                    </time>
                  </div>
                  <h3 className="font-semibold">{event.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{event.detail}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
