import { Card, CardContent, CardHeader, EmptyState } from "@paysave/ui";
import type { CapabilityExplorerModel } from "../domain/capability-explorer";
import { CapabilityStatusBadge } from "./capability-status-badge";

export function CapabilityMatrix({ model }: { readonly model: CapabilityExplorerModel }) {
  if (model.capabilities.length === 0) {
    return (
      <EmptyState
        description="The Capability Registry returned no capability candidates."
        title="No registered capabilities"
      />
    );
  }

  return (
    <>
      <div
        className="hidden overflow-x-auto rounded-xl border bg-card md:block"
        data-layout="desktop-capability-matrix"
        role="region"
        aria-label="Provider capability matrix"
        tabIndex={0}
      >
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Capability</th>
              <th className="px-4 py-3 font-medium">Category</th>
              {model.providers.map((provider) => (
                <th className="px-4 py-3 font-medium capitalize" key={provider}>
                  {provider}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {model.capabilities.map((capability) => (
              <tr className="border-t align-top" key={capability.id}>
                <td className="px-4 py-4 font-mono text-xs font-semibold">{capability.id}</td>
                <td className="px-4 py-4 text-muted-foreground">{capability.category}</td>
                {capability.providers.map((provider) => (
                  <td className="px-4 py-4" key={provider.providerId}>
                    <CapabilityStatusBadge availability={provider.availability} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:hidden" data-layout="mobile-capability-matrix">
        {model.capabilities.map((capability) => (
          <Card key={capability.id}>
            <CardHeader className="space-y-1">
              <h3 className="font-mono text-sm font-semibold break-words">{capability.id}</h3>
              <p className="text-xs text-muted-foreground">{capability.category}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {capability.providers.map((provider) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 first:border-t-0 first:pt-0"
                  key={provider.providerId}
                >
                  <span className="text-sm font-medium capitalize">{provider.providerId}</span>
                  <CapabilityStatusBadge availability={provider.availability} />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
