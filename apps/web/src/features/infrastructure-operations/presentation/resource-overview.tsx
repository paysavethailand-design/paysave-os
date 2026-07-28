import { Badge, Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { InfrastructureOperationDomainModel } from "../domain/infrastructure-operations";
import { OperationStatusBadge } from "./operation-status-badge";

export function ResourceOverview({
  domain,
}: {
  readonly domain: InfrastructureOperationDomainModel;
}) {
  return (
    <section aria-labelledby={`${domain.id}-overview-heading`} className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id={`${domain.id}-overview-heading`} className="text-xl font-semibold sm:text-2xl">
            {domain.label}
          </h2>
          <Badge variant="neutral">REGISTRY COVERAGE</Badge>
        </div>
        <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{domain.description}</p>
        <div className="flex flex-wrap gap-2 text-xs">
          {(["SUPPORTED", "PARTIAL", "NOT SUPPORTED", "EXPERIMENTAL"] as const).map((state) => (
            <span className="inline-flex items-center gap-1" key={state}>
              <OperationStatusBadge availability={state} />
              <span className="text-muted-foreground">{domain.counts[state]}</span>
            </span>
          ))}
        </div>
      </div>

      {domain.capabilities.length === 0 ? (
        <EmptyState
          description="Neither registry publishes a capability for this operation domain."
          title="NOT SUPPORTED"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {domain.capabilities.map((capability) => (
            <Card key={capability.id}>
              <CardHeader className="space-y-1">
                <h3 className="font-mono text-sm font-semibold break-words">{capability.id}</h3>
                <p className="text-xs text-muted-foreground capitalize">{capability.category}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {capability.providers.map((provider) => (
                  <div
                    className="border-t pt-3 first:border-t-0 first:pt-0"
                    key={provider.providerId}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium capitalize">{provider.providerId}</span>
                      <OperationStatusBadge availability={provider.availability} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Plane: {provider.plane ?? "NOT PUBLISHED"} · Access:{" "}
                      {provider.access ?? "NOT PUBLISHED"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
