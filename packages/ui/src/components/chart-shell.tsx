import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
export interface ChartShellProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}
/** Provides consistent accessible framing for chart visualizations. */
export function ChartShell({ title, description, action, children }: ChartShellProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>
        <div aria-label={title} role="img">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
