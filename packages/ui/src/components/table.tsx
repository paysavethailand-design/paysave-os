import type {
  HTMLAttributes,
  TableHTMLAttributes,
  ThHTMLAttributes,
  TdHTMLAttributes,
} from "react";
import { cn } from "../lib/cn";

/** Renders a table inside a responsive horizontal-scroll container. */
export function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div
      aria-label="ตารางข้อมูลแบบเลื่อนได้"
      className="focus-visible:outline-ring relative w-full overflow-x-auto rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
      data-slot="table-container"
      role="region"
      tabIndex={0}
    >
      <table
        className={cn("w-full min-w-[680px] caption-bottom text-sm", className)}
        data-slot="table"
        {...props}
      />
    </div>
  );
}

/** Renders the table header group. */
export function TableHeader({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-border bg-muted/60", className)}
      data-slot="table-header"
      {...props}
    />
  );
}

/** Renders the table body group. */
export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border", className)} data-slot="table-body" {...props} />
  );
}

/** Renders the table footer group. */
export function TableFooter({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tfoot
      className={cn("border-t border-border bg-muted/50 font-medium", className)}
      data-slot="table-footer"
      {...props}
    />
  );
}

/** Renders a table row with a subtle hover state. */
export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-primary/5 data-[state=selected]:bg-primary/8",
        className,
      )}
      data-slot="table-row"
      {...props}
    />
  );
}

/** Renders an accessible table column heading. */
export function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle text-xs font-semibold tracking-wide text-muted-foreground uppercase",
        className,
      )}
      data-slot="table-head"
      {...props}
    />
  );
}

/** Renders a table data cell. */
export function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3.5 align-middle", className)} data-slot="table-cell" {...props} />
  );
}

/** Renders a table caption below the data. */
export function TableCaption({ className, ...props }: HTMLAttributes<HTMLTableCaptionElement>) {
  return (
    <caption
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      data-slot="table-caption"
      {...props}
    />
  );
}
