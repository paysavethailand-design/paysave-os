import { Card, CardContent, CardHeader } from "@paysave/ui";
import type { SystemIntegritySummary } from "../domain/diagnostics";
import { DiagnosticsStatusBadge } from "./diagnostics-status-badge";

export function ValidationSummary({ summary }: { readonly summary: SystemIntegritySummary }) {
  const counts = [
    ["Total", summary.total],
    ["Passed", summary.passed],
    ["Failed", summary.failed],
    ["Unknown", summary.unknown],
  ] as const;

  return (
    <section aria-labelledby="system-integrity-summary" className="space-y-4">
      <h2 id="system-integrity-summary" className="text-xl font-semibold sm:text-2xl">
        System Integrity Summary
      </h2>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Validator and Read Model integrity</h3>
            <DiagnosticsStatusBadge status={summary.status} />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{summary.detail}</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {counts.map(([label, value]) => (
            <div key={label} className="rounded-lg border bg-muted/20 p-4">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
