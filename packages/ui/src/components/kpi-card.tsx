import type { ReactNode } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "../lib/cn";
import { Card, CardContent } from "./card";

export interface KpiCardProps {
  readonly label: string;
  readonly value: string;
  readonly trend?: string;
  readonly trendDirection?: "up" | "down" | "neutral";
  readonly helper?: string;
  readonly icon?: ReactNode;
  readonly className?: string;
}

/** Displays a compact executive KPI with semantic trend treatment. */
export function KpiCard({
  label,
  value,
  trend,
  trendDirection = "neutral",
  helper,
  icon,
  className,
}: KpiCardProps) {
  const TrendIcon =
    trendDirection === "up"
      ? ArrowUpRight
      : trendDirection === "down"
        ? ArrowDownRight
        : ArrowRight;
  return (
    <Card className={cn("relative overflow-hidden border-border/80", className)}>
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 bg-primary" />
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight sm:text-[1.75rem]">{value}</p>
          </div>
          {icon ? (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/9 text-primary">
              {icon}
            </span>
          ) : null}
        </div>
        {trend || helper ? (
          <div className="mt-4 flex items-center gap-2 text-xs">
            {trend ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 font-semibold",
                  trendDirection === "down"
                    ? "text-danger"
                    : trendDirection === "up"
                      ? "text-success"
                      : "text-muted-foreground",
                )}
              >
                <TrendIcon className="size-3.5" />
                {trend}
              </span>
            ) : null}
            {helper ? <span className="text-muted-foreground">{helper}</span> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
