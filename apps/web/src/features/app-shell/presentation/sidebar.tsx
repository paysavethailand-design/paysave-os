"use client";

import type { AuthContext } from "@paysave/security";
import { Badge, cn, Separator, SheetClose } from "@paysave/ui";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVisibleNavigation } from "../domain/navigation";
import { navigationIcons } from "./navigation-icons";

interface SidebarProps {
  readonly context: AuthContext;
  readonly mobile?: boolean;
}

/** Renders permission-filtered PAYSAVE navigation for desktop or mobile. */
export function Sidebar({ context, mobile = false }: SidebarProps) {
  const pathname = usePathname();
  const items = getVisibleNavigation(context);

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-slate-950 text-white",
        mobile ? "w-full" : "fixed inset-y-0 left-0 z-40 hidden w-72 lg:flex",
      )}
    >
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="grid size-11 place-items-center rounded-lg bg-primary text-lg font-bold shadow-button">
          P
        </span>
        <div>
          <p className="font-semibold tracking-wide">PAYSAVE</p>
          <p className="text-xs text-slate-400">Recovery OS</p>
        </div>
      </div>
      <Separator className="bg-white/10" />
      <nav aria-label="เมนูหลัก" className="flex-1 space-y-1 overflow-y-auto p-4">
        {items.map((item) => {
          const Icon = navigationIcons[item.key];
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const link = (
            <Link
              className={cn(
                "group flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium text-slate-300 transition",
                active ? "bg-white text-slate-950 shadow-sm" : "hover:bg-white/8 hover:text-white",
              )}
              href={item.href as Route}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-[18px]",
                  active ? "text-primary" : "text-slate-400 group-hover:text-white",
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
          return mobile ? (
            <SheetClose asChild key={item.key}>
              {link}
            </SheetClose>
          ) : (
            <div key={item.key}>{link}</div>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">สถานะระบบ</p>
            <Badge
              className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              variant="neutral"
            >
              พร้อม
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Partner #{context.activePartnerId ?? "—"} · Session v{context.sessionVersion}
          </p>
        </div>
      </div>
    </aside>
  );
}
