import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { DiagnosticsCheck } from "../domain/diagnostics";
import { DiagnosticsStatusBadge } from "./diagnostics-status-badge";

export function IntegritySection({
  id,
  title,
  description,
  checks,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly checks: readonly DiagnosticsCheck[];
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <div className="space-y-1">
        <h2 id={id} className="text-xl font-semibold sm:text-2xl">
          {title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {checks.map((check) => (
          <Card key={check.id}>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">{check.title}</h3>
                <DiagnosticsStatusBadge status={check.status} />
              </div>
              <Badge variant="neutral" className="w-fit max-w-full break-all">
                {check.code}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{check.detail}</p>
              <div>
                <p className="font-medium text-foreground">Evidence</p>
                {check.evidence.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {check.evidence.map((item) => (
                      <li key={item}>
                        <Badge variant="neutral" className="break-all">
                          {item}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2">No non-sensitive evidence is available for this outcome.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
