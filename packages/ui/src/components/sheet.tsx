"use client";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, HTMLAttributes } from "react";
import { cn } from "../lib/cn";

/** Provides responsive sheet state and focus management. */
export function Sheet(props: ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}
/** Opens a responsive sheet. */
export function SheetTrigger(props: ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}
/** Closes the nearest responsive sheet. */
export function SheetClose(props: ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}
/** Renders the backdrop behind a responsive sheet. */
export function SheetOverlay({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn("fixed inset-0 z-50 bg-slate-950/35 backdrop-blur-sm", className)}
      data-slot="sheet-overlay"
      {...props}
    />
  );
}

interface SheetContentProps extends ComponentProps<typeof SheetPrimitive.Content> {
  readonly closeButtonClassName?: string;
  readonly side?: "top" | "right" | "bottom" | "left";
}

/** Renders a responsive edge-aligned sheet panel. */
export function SheetContent({
  className,
  children,
  closeButtonClassName,
  side = "right",
  ...props
}: SheetContentProps) {
  const sides = {
    top: "inset-x-0 top-0 border-b",
    right: "inset-y-0 right-0 h-full w-[88%] max-w-sm border-l",
    bottom: "inset-x-0 bottom-0 border-t",
    left: "inset-y-0 left-0 h-full w-[88%] max-w-sm border-r",
  } as const;
  return (
    <SheetPrimitive.Portal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(
          "fixed z-50 bg-surface/96 p-6 shadow-dialog backdrop-blur-2xl outline-none",
          sides[side],
          className,
        )}
        data-slot="sheet-content"
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          className={cn(
            "absolute top-4 right-4 grid size-9 place-items-center rounded-full text-muted-foreground hover:bg-muted focus-visible:ring-4 focus-visible:ring-primary/15 focus-visible:outline-none",
            closeButtonClassName,
          )}
        >
          <X className="size-4" />
          <span className="sr-only">ปิด</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}
/** Renders the heading region of a sheet. */
export function SheetHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("grid gap-2 text-left", className)} data-slot="sheet-header" {...props} />
  );
}
/** Renders the action region of a sheet. */
export function SheetFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2", className)}
      data-slot="sheet-footer"
      {...props}
    />
  );
}
/** Renders the required accessible sheet title. */
export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn("text-lg font-semibold", className)}
      data-slot="sheet-title"
      {...props}
    />
  );
}
/** Renders supporting accessible sheet description. */
export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}
