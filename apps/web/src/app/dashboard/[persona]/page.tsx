import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireAuth } from "@/features/auth/server";
import {
  dashboardPersonas,
  FrontendDashboardPage,
  isDashboardPersona,
  canAccessDashboard,
} from "@/features/frontend-dashboard";

interface PageProps {
  readonly params: Promise<{ persona: string }>;
}

export function generateStaticParams() {
  return dashboardPersonas.map((persona) => ({ persona }));
}

export default async function DashboardPersonaPage({ params }: PageProps) {
  const { persona } = await params;
  if (!isDashboardPersona(persona)) notFound();

  // Role-based route guard using Supabase JWT claims (roles from custom access token hook)
  const context = await requireAuth(`/dashboard/${persona}`);
  if (!canAccessDashboard(persona, context.roles)) {
    redirect("/unauthorized" as Route);
  }

  return <FrontendDashboardPage persona={persona} />;
}
