import { DashboardShell } from "@/features/frontend-dashboard";
import type { ReactNode } from "react";

export default function InventoryLayout({ children }: { readonly children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
