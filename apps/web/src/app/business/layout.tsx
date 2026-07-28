import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  BusinessPlatformBreadcrumb,
  BusinessPlatformNavigation,
} from "@/features/business-platform";
import { loadBusinessPlatformOverview } from "@/features/business-platform/server";

export default async function BusinessPlatformLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  const model = await loadBusinessPlatformOverview();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            aria-label="PAYSAVE home"
            className="text-sm font-bold tracking-[0.18em] text-foreground uppercase"
            href={"/" as Route}
          >
            PAYSAVE
          </Link>
          <BusinessPlatformBreadcrumb modules={model.modules} />
        </div>
      </header>
      <BusinessPlatformNavigation modules={model.modules} />
      {children}
    </div>
  );
}
