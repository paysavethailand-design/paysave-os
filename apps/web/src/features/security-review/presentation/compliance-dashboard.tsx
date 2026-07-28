import { Card, CardContent, CardHeader } from "@paysave/ui";
import type { ComplianceStatus } from "../domain/security-review";
import { SecurityReviewStatusBadge } from "./security-review-status-badge";

export function ComplianceDashboard({ summary }: { readonly summary: ComplianceStatus }) {
  const counts = [
    ["Total", summary.total],
    ["Passed", summary.passed],
    ["Failed", summary.failed],
    ["Unknown", summary.unknown],
    ["Findings", summary.findings],
  ] as const;

  return (
    <section aria-labelledby="compliance-status" className="space-y-4">
      <h2 id="compliance-status" className="text-xl font-semibold sm:text-2xl">
        Compliance Status
      </h2>
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">Security control compliance</h3>
            <SecurityReviewStatusBadge status={summary.status} />
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{summary.detail}</p>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
