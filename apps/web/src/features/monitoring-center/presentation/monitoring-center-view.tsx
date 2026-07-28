import { Badge } from "@paysave/ui";
import type { MonitoringCenterModel } from "../domain/monitoring-center";
import { AlertsPanel } from "./alerts-panel";
import { EventTimeline } from "./event-timeline";
import { HealthDashboard } from "./health-dashboard";
import { MetricsGrid } from "./metrics-grid";

export function MonitoringCenterView({ model }: { readonly model: MonitoringCenterModel }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] space-y-12 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">READ ONLY</Badge>
          <Badge variant="success">REGISTRY + MONITORING READ MODELS</Badge>
        </div>
        <div>
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Infrastructure Center
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Monitoring Center</h1>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground sm:text-base">
          Read-only registry and process monitoring snapshot. This page does not probe, execute, or
          control providers and does not establish live external reachability.
        </p>
        <p className="text-xs text-muted-foreground">
          Snapshot generated {new Date(model.generatedAt).toLocaleString("en-GB")}
        </p>
      </header>

      <HealthDashboard model={model} />
      <MetricsGrid metrics={model.systemMetrics} />
      <EventTimeline events={model.recentEvents} />
      <AlertsPanel alerts={model.alerts} />

      <footer className="rounded-xl border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
        Event, metric, warning, and health information is read-only. Missing signals are displayed
        as UNKNOWN or UNCONFIRMED rather than inferred as healthy.
      </footer>
    </main>
  );
}
