"use client";

import type { AuthContext } from "@paysave/security";
import {
  Button,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@paysave/ui";
import { Menu } from "lucide-react";
import { AppBreadcrumb } from "./app-breadcrumb";
import { NotificationMenu, type AppNotification } from "./notification-menu";
import { ProfileMenu, type AppProfile } from "./profile-menu";
import { Sidebar } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  readonly context: AuthContext;
  readonly notifications: readonly AppNotification[];
  readonly profile: AppProfile;
}

/** Renders the responsive glass application header and mobile navigation trigger. */
export function Header({ context, notifications, profile }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/78 backdrop-blur-2xl">
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Sheet>
          <SheetTrigger asChild>
            <Button aria-label="เปิดเมนูหลัก" className="lg:hidden" size="icon" variant="ghost">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="p-0"
            closeButtonClassName="text-slate-400 hover:bg-white/10 hover:text-white"
            side="left"
          >
            <SheetTitle className="sr-only">เมนูหลัก</SheetTitle>
            <SheetDescription className="sr-only">เมนูนำทาง PAYSAVE</SheetDescription>
            <Sidebar context={context} mobile />
          </SheetContent>
        </Sheet>
        <AppBreadcrumb />
        <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <NotificationMenu notifications={notifications} />
          <Separator className="mx-1 hidden h-7 sm:block" orientation="vertical" />
          <ProfileMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}
