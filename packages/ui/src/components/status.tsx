import { cn } from "../lib/cn";

export interface StatusProps {
  readonly label: string;
  readonly tone?: "success" | "warning" | "danger" | "info" | "neutral";
  readonly className?: string;
}
const tones = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  neutral: "bg-muted text-muted-foreground",
} as const;
const dots = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-muted-foreground",
} as const;
/** Renders a readable status pill that does not rely on color alone. */
export function Status({ label, tone = "neutral", className }: StatusProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
      role="status"
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dots[tone])} />
      {label}
    </span>
  );
}
