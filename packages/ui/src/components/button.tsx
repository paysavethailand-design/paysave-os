import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-semibold transition-[background-color,color,box-shadow,transform] duration-200 outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-button hover:bg-primary-hover",
        success: "bg-success text-success-foreground shadow-button hover:bg-success-hover",
        secondary: "border border-border bg-surface text-foreground shadow-xs hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-danger text-white shadow-button hover:bg-danger/90",
      },
      size: {
        sm: "min-h-9 rounded-sm px-3 text-xs",
        md: "min-h-11 px-4",
        lg: "min-h-12 rounded-lg px-6 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

/** Renders a PAYSAVE action button with semantic visual variants. */
export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot="button"
      type={type}
      {...props}
    />
  );
}

export { buttonVariants };
