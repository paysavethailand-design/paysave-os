import { Badge, Card, CardContent, CardHeader } from "@paysave/ui";
import type { InventoryDashboardModel } from "../application/queries/project-inventory-dashboard";
import { INVENTORY_DASHBOARD_COPY as copy } from "./inventory-dashboard-copy";

function MetricCard({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2 text-sm text-muted-foreground">{label}</CardHeader>
      <CardContent className="text-3xl font-semibold tabular-nums">
        {value.toLocaleString()}
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  rows,
}: {
  readonly title: string;
  readonly rows: readonly { readonly label: string; readonly count: number }[];
}) {
  return (
    <Card className="min-w-0">
      <CardHeader className="font-semibold">{title}</CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div className="flex items-center justify-between gap-4" key={row.label}>
                <span className="min-w-0 truncate text-sm">{row.label}</span>
                <Badge variant="neutral">{row.count.toLocaleString()}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Responsive read-only executive view for inventory lifecycle and sales projections. */
export function InventoryDashboardView({ model }: { readonly model: InventoryDashboardModel }) {
  return (
    <div className="space-y-8">
      <section>
        <Badge variant="neutral">Inventory Lifecycle</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Inventory & Sales Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Generated {new Date(model.generatedAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
        </p>
      </section>

      <section aria-labelledby="inventory-heading" className="space-y-4">
        <h2 className="text-xl font-semibold" id="inventory-heading">
          Inventory Dashboard
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label={copy.totalStock} value={model.inventory.totalStock} />
          <MetricCard label={copy.readyForSale} value={model.inventory.readyForSale} />
          <MetricCard label={copy.reserved} value={model.inventory.reserved} />
          <MetricCard label={copy.soldToday} value={model.inventory.soldToday} />
          <MetricCard label={copy.deadStock} value={model.inventory.deadStock} />
        </div>
        <Card>
          <CardHeader className="font-semibold">{copy.aging}</CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {model.inventory.aging.map((row) => (
              <div className="rounded-xl border border-border p-4" key={row.bucket}>
                <p className="text-sm text-muted-foreground">{row.bucket} days</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {row.count.toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="sales-heading" className="space-y-4">
        <h2 className="text-xl font-semibold" id="sales-heading">
          Sales Dashboard
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label={copy.dailySales} value={model.sales.dailySales} />
          <MetricCard label={copy.monthlySales} value={model.sales.monthlySales} />
        </div>
        <div className="grid min-w-0 gap-4 lg:grid-cols-3">
          <Breakdown rows={model.sales.byBrand} title={copy.byBrand} />
          <Breakdown rows={model.sales.byBuyer} title={copy.byBuyer} />
          <Breakdown rows={model.sales.byEmployee} title={copy.byEmployee} />
        </div>
      </section>

      <section aria-label="Lifecycle states" className="flex flex-wrap gap-2">
        {[
          "Received",
          "Inspection",
          "Ready for Sale",
          "Reserved",
          "Sold",
          "Delivered",
          "Closed",
        ].map((status) => (
          <Badge key={status} variant="neutral">
            {status}
          </Badge>
        ))}
      </section>
    </div>
  );
}
