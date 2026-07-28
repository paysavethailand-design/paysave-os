import { DashboardShell } from "@/features/frontend-dashboard";
import { RecoveryQueryProvider } from "@/features/recovery-management";
import type { ReactNode } from "react";
export default function RecoveryLayout({ children }: { readonly children: ReactNode }) {
  return (
    <RecoveryQueryProvider>
      <DashboardShell>{children}</DashboardShell>
    </RecoveryQueryProvider>
  );
}
