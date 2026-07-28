import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { SecurityFinding } from "../domain/security-review";

export function SecurityFindingsView({
  findings,
}: {
  readonly findings: readonly SecurityFinding[];
}) {
  return (
    <section aria-labelledby="security-findings-summary" className="space-y-4">
      <div className="space-y-1">
        <h2 id="security-findings-summary" className="text-xl font-semibold sm:text-2xl">
          Security Findings Summary
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Findings are derived from the current Security Validator result and cannot be changed from
          this page.
        </p>
      </div>
      {findings.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {findings.map((finding) => (
            <Card key={finding.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-semibold">{finding.title}</h3>
                  <Badge variant={finding.severity === "HIGH" ? "danger" : "neutral"}>
                    {finding.severity}
                  </Badge>
                </div>
                <Badge variant="neutral" className="w-fit max-w-full break-all">
                  {finding.id}
                </Badge>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {finding.detail}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-sm leading-6 text-muted-foreground">
            No Security Validator findings are present in this snapshot.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
