import type { InfrastructureDashboardModel } from "../domain/infrastructure-dashboard";
import { AlertsWarnings, RecentActivities } from "./activity-alerts";
import { CapabilitySummary } from "./capability-summary";
import { DashboardOverview } from "./dashboard-overview";
import { EnvironmentStatus, ProviderStatus } from "./status-panels";

export function InfrastructureDashboardView({
  model,
}: {
  readonly model: InfrastructureDashboardModel;
}) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-[1600px] space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Infrastructure Center
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Infrastructure Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Read-only operational view supplied through the Application Layer. Provider selection
              and execution controls are intentionally unavailable.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Snapshot <time dateTime={model.generatedAt}>{model.generatedAt}</time>
          </p>
        </header>

        <DashboardOverview model={model} />
        <ProviderStatus providers={model.providers} />
        <EnvironmentStatus environments={model.environments} />
        <CapabilitySummary capabilities={model.capabilities} />
        <RecentActivities activities={model.activities} />
        <AlertsWarnings alerts={model.alerts} />
      </div>
    </main>
  );
}
