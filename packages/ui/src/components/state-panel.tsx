import type { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { Card, CardContent } from "./card";
interface StateProps {
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
  readonly icon?: ReactNode;
  readonly className?: string;
}
function Panel({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  className,
  alert = false,
}: StateProps & { readonly alert?: boolean }) {
  return (
    <Card className={cn("border-dashed", className)}>
      <CardContent
        className="flex min-h-52 flex-col items-center justify-center p-8 text-center"
        role={alert ? "alert" : undefined}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
          {icon}
        </span>
        <h3 className="mt-4 text-base font-semibold">{title}</h3>
        {description ? (
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
        {actionLabel ? (
          <Button className="mt-5" onClick={onAction} variant="secondary">
            {actionLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
export function EmptyState(props: StateProps) {
  return <Panel icon={<Inbox className="size-5" />} {...props} />;
}
export function ErrorState(props: StateProps) {
  return <Panel alert icon={<AlertTriangle className="size-5 text-danger" />} {...props} />;
}
