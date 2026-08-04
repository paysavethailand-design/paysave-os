import { notFound } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isDashboardPersona } from "./domain/dashboard";
import { SupabaseDashboardRepository } from "./infrastructure/supabase/supabase-dashboard-repository";
import { DashboardView } from "./presentation/dashboard-view";
export async function FrontendDashboardPage({
  canViewInventory,
  client,
  persona,
}: {
  readonly canViewInventory: boolean;
  readonly client: SupabaseClient;
  readonly persona: string;
}) {
  if (!isDashboardPersona(persona)) notFound();
  const model = await new SupabaseDashboardRepository(client).getDashboard(persona);
  return <DashboardView canViewInventory={canViewInventory} model={model} />;
}
