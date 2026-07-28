import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn";

const cardVariants = cva("rounded-3xl border text-card-foreground", {
  variants: {
    variant: {
      default: "border-border bg-card shadow-card",
      glass:
        "border-white/70 bg-surface/75 shadow-glass backdrop-blur-xl supports-[backdrop-filter]:bg-surface/68 dark:border-white/10",
      outline: "border-border bg-transparent shadow-none",
      elevated: "border-white bg-card shadow-elevated",
    },
  },
  defaultVariants: { variant: "default" },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

/** Renders a semantic PAYSAVE content surface. */
export function Card({ className, variant, ...props }: CardProps) {
  return <div className={cn(cardVariants({ variant }), className)} data-slot="card" {...props} />;
}

/** Renders the heading region of a card. */
export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-1.5 p-6 md:p-7", className)} data-slot="card-header" {...props} />
  );
}

/** Renders a card title with consistent typography. */
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight", className)}
      data-slot="card-title"
      {...props}
    />
  );
}

/** Renders supporting card description text. */
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      data-slot="card-description"
      {...props}
    />
  );
}

/** Renders the main content region of a card. */
export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pb-6 md:px-7 md:pb-7", className)}
      data-slot="card-content"
      {...props}
    />
  );
}

/** Renders the action region of a card. */
export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex items-center px-6 pb-6 md:px-7 md:pb-7", className)}
      data-slot="card-footer"
      {...props}
    />
  );
}
