import type { InputHTMLAttributes } from "react";
import { cn } from "../lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

/** Renders a responsive input with clear focus, invalid and disabled states. */
export function Input({ className, type = "text", ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-md border border-input bg-surface/90 px-3.5 text-sm text-foreground shadow-input transition outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 aria-invalid:border-danger aria-invalid:ring-danger/10",
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}
