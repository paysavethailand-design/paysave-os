import { notFound } from "next/navigation";
import { isDashboardPersona } from "./domain/dashboard";
import { SupabaseDashboardRepository } from "./infrastructure/supabase/supabase-dashboard-repository";
import { DashboardView } from "./presentation/dashboard-view";
export async function FrontendDashboardPage({ persona }: { readonly persona: string }) {
  if (!isDashboardPersona(persona)) notFound();
  const model = await new SupabaseDashboardRepository().getDashboard(persona);
  return <DashboardView model={model} />;
}
