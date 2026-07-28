"use client";

import type { AuthContext } from "@paysave/security";
import type { ReactNode } from "react";
import { Header } from "./header";
import type { AppNotification } from "./notification-menu";
import type { AppProfile } from "./profile-menu";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  readonly children: ReactNode;
  readonly context: AuthContext;
  readonly notifications: readonly AppNotification[];
  readonly profile: AppProfile;
}

/** Composes the responsive PAYSAVE sidebar, header and content viewport. */
export function AppShell({ children, context, notifications, profile }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar context={context} />
      <div className="min-h-screen lg:pl-72">
        <Header context={context} notifications={notifications} profile={profile} />
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
