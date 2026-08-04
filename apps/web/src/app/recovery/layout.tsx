import { hasPermission } from "@paysave/security";
import type { ReactNode } from "react";
import { ASSETS_PERMISSIONS } from "@/features/assets/server";
import { getAuthContext } from "@/features/auth/server";
import { DashboardShell } from "@/features/frontend-dashboard";
import { RecoveryQueryProvider } from "@/features/recovery-management";

export default async function RecoveryLayout({ children }: { readonly children: ReactNode }) {
  const actor = await getAuthContext();
  return (
    <RecoveryQueryProvider>
      <DashboardShell
        canViewInventory={Boolean(actor && hasPermission(actor, ASSETS_PERMISSIONS.READ))}
      >
        {children}
      </DashboardShell>
    </RecoveryQueryProvider>
  );
}
