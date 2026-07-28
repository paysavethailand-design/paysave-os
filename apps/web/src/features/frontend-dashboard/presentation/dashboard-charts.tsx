"use client";
import { ChartShell } from "@paysave/ui";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DistributionPoint, TrendPoint } from "../domain/dashboard";
export function DashboardCharts({
  trend,
  distribution,
}: {
  readonly trend: readonly TrendPoint[];
  readonly distribution: readonly DistributionPoint[];
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
      <ChartShell title="Performance trend" description="เปรียบเทียบผลลัพธ์หลักกับ Baseline">
        <div className="h-72 w-full">
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={[...trend]} margin={{ left: -18, right: 8, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id="primaryFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0a66c2" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0a66c2" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid
                stroke="var(--ps-color-border)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <XAxis axisLine={false} dataKey="label" fontSize={12} tickLine={false} />
              <YAxis axisLine={false} fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--ps-color-border)",
                  background: "var(--ps-color-surface)",
                }}
              />
              <Area
                dataKey="secondary"
                fill="transparent"
                isAnimationActive={false}
                stroke="#9aa9ba"
                strokeDasharray="5 5"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="primary"
                fill="url(#primaryFill)"
                isAnimationActive={false}
                stroke="#0a66c2"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartShell>
      <ChartShell title="Status distribution" description="สัดส่วนรายการในรอบปัจจุบัน">
        <div className="h-56">
          <ResponsiveContainer height="100%" width="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={[...distribution]}
                dataKey="value"
                innerRadius={58}
                isAnimationActive={false}
                nameKey="name"
                outerRadius={82}
                paddingAngle={4}
              >
                {distribution.map((item) => (
                  <Cell fill={item.color} key={item.name} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--ps-color-border)",
                  background: "var(--ps-color-surface)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 space-y-2">
          {distribution.map((item) => (
            <div className="flex items-center justify-between text-sm" key={item.name}>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}
              </span>
              <strong>{item.value}%</strong>
            </div>
          ))}
        </div>
      </ChartShell>
    </div>
  );
}
