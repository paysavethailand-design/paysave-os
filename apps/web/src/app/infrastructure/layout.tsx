import type { ReactNode } from "react";
import { InfrastructureCenterNavigation } from "@/features/infrastructure-dashboard";

export default function InfrastructureCenterLayout({ children }: { readonly children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <InfrastructureCenterNavigation />
      {children}
    </div>
  );
}
