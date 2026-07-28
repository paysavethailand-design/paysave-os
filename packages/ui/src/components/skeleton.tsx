import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";
/** Visual loading placeholder hidden from screen readers unless explicitly labelled. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} {...props} />;
}
