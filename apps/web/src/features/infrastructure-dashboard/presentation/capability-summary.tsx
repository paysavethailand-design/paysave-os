import { Badge, Card, CardContent } from "@paysave/ui";
import type { InfrastructureDashboardModel } from "../domain/infrastructure-dashboard";
import { infrastructureCapabilityLabels } from "./infrastructure-dashboard-copy";

function availabilityVariant(availability: string): "success" | "warning" | "neutral" {
  if (availability === infrastructureCapabilityLabels.available) return "success";
  if (availability === infrastructureCapabilityLabels.experimental) return "warning";
  if (availability === infrastructureCapabilityLabels.unsupported) return "neutral";
  return "neutral";
}

export function CapabilitySummary({
  capabilities,
}: {
  readonly capabilities: InfrastructureDashboardModel["capabilities"];
}) {
  return (
    <section aria-labelledby="capability-summary-heading" className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold" id="capability-summary-heading">
          Capability Summary
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only manifest view. Experimental operations remain disabled.
        </p>
      </div>
      <div className="grid gap-3 md:hidden" data-layout="mobile-capability-list">
        {capabilities.map((capability) => (
          <Card key={`mobile:${capability.providerId}:${capability.id}`}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{capability.providerName}</p>
                  <p className="mt-1 font-mono text-xs break-all">{capability.id}</p>
                </div>
                <Badge variant={availabilityVariant(capability.availability)}>
                  {capability.availability}
                </Badge>
              </div>
              <p className="text-xs tracking-wide text-muted-foreground uppercase">
                {capability.category} · {capability.access}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="hidden overflow-hidden md:block" data-layout="desktop-capability-table">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Capability</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Access</th>
                  <th className="px-4 py-3">Availability</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((capability) => (
                  <tr
                    className="border-b border-border/70 last:border-0"
                    key={`${capability.providerId}:${capability.id}`}
                  >
                    <td className="px-4 py-3 font-medium">{capability.providerName}</td>
                    <td className="px-4 py-3 font-mono text-xs">{capability.id}</td>
                    <td className="px-4 py-3">{capability.category}</td>
                    <td className="px-4 py-3 text-muted-foreground uppercase">
                      {capability.access}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={availabilityVariant(capability.availability)}>
                        {capability.availability}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
