"use client";

import { ChartShell, Skeleton } from "@paysave/ui";
import dynamic from "next/dynamic";
import type { DistributionPoint, TrendPoint } from "../domain/dashboard";

const DashboardChartsClient = dynamic(
  () => import("./dashboard-charts").then((module) => module.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
        <ChartShell title="Performance trend" description="กำลังเตรียมกราฟจำลอง">
          <Skeleton className="h-72" />
        </ChartShell>
        <ChartShell title="Status distribution" description="กำลังเตรียมกราฟจำลอง">
          <Skeleton className="h-72" />
        </ChartShell>
      </div>
    ),
  },
);

export function LazyDashboardCharts(props: {
  readonly trend: readonly TrendPoint[];
  readonly distribution: readonly DistributionPoint[];
}) {
  return <DashboardChartsClient {...props} />;
}
