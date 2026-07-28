import { Slot } from "@radix-ui/react-slot";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentProps, HTMLAttributes, LiHTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** Provides semantic navigation context for breadcrumb items. */
export function Breadcrumb(props: ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

/** Renders the breadcrumb item list. */
export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
      data-slot="breadcrumb-list"
      {...props}
    />
  );
}

/** Renders one breadcrumb list item. */
export function BreadcrumbItem({ className, ...props }: LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
      data-slot="breadcrumb-item"
      {...props}
    />
  );
}

interface BreadcrumbLinkProps extends ComponentProps<"a"> {
  readonly asChild?: boolean;
}

/** Renders a breadcrumb link or delegates rendering through Radix Slot. */
export function BreadcrumbLink({ asChild, className, ...props }: BreadcrumbLinkProps) {
  const Component = asChild ? Slot : "a";
  return (
    <Component
      className={cn("truncate transition-colors hover:text-foreground", className)}
      data-slot="breadcrumb-link"
      {...props}
    />
  );
}

/** Renders the current non-interactive breadcrumb page. */
export function BreadcrumbPage({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-current="page"
      className={cn("truncate font-medium text-foreground", className)}
      data-slot="breadcrumb-page"
      {...props}
    />
  );
}

/** Renders a visual separator between breadcrumb items. */
export function BreadcrumbSeparator({
  children,
  className,
  ...props
}: LiHTMLAttributes<HTMLLIElement>) {
  return (
    <li
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

/** Renders an ellipsis for collapsed breadcrumb segments. */
export function BreadcrumbEllipsis({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-9 items-center justify-center", className)}
      data-slot="breadcrumb-ellipsis"
      {...props}
    >
      <MoreHorizontal className="size-4" />
      <span className="sr-only">เพิ่มเติม</span>
    </span>
  );
}
