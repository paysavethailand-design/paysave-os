import { hasPermission } from "@paysave/security";
import type { ReactNode } from "react";
import { ASSETS_PERMISSIONS } from "@/features/assets/server";
import { getAuthContext } from "@/features/auth/server";
import { DashboardShell } from "@/features/frontend-dashboard";

export default async function InventoryLayout({ children }: { readonly children: ReactNode }) {
  const actor = await getAuthContext();
  return (
    <DashboardShell
      canViewInventory={Boolean(actor && hasPermission(actor, ASSETS_PERMISSIONS.READ))}
    >
      {children}
    </DashboardShell>
  );
}
