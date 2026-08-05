import { notFound } from "next/navigation";
import type { PermissionCode, RoleCode } from "@paysave/security";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDashboardPersona } from "./domain/dashboard";
import { SupabaseDashboardRepository } from "./infrastructure/supabase/supabase-dashboard-repository";
import { DashboardView } from "./presentation/dashboard-view";
export async function FrontendDashboardPage({
  canViewInventory,
  client,
  permissions,
  persona,
  roles,
}: {
  readonly canViewInventory: boolean;
  readonly client: SupabaseClient;
  readonly permissions: readonly PermissionCode[];
  readonly persona: string;
  readonly roles: readonly RoleCode[];
}) {
  if (!isDashboardPersona(persona)) notFound();
  const model = await new SupabaseDashboardRepository(client).getDashboard(persona);
  return (
    <DashboardView
      canViewInventory={canViewInventory}
      model={model}
      permissions={permissions}
      roles={roles}
    />
  );
}
