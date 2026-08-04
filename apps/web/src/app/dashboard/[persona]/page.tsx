import { notFound } from "next/navigation";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { hasPermission } from "@paysave/security";
import { createAuthServerClient, requireAuth } from "@/features/auth/server";
import { ASSETS_PERMISSIONS } from "@/features/assets/server";
import {
  FrontendDashboardPage,
  canAccessDashboard,
  isDashboardPersona,
} from "@/features/frontend-dashboard";

interface PageProps {
  readonly params: Promise<{ persona: string }>;
}

export const dynamic = "force-dynamic";

export default async function DashboardPersonaPage({ params }: PageProps) {
  const { persona } = await params;
  if (!isDashboardPersona(persona)) notFound();

  // Role-based route guard using Supabase JWT claims (roles from custom access token hook)
  const context = await requireAuth(`/dashboard/${persona}`);
  if (!canAccessDashboard(persona, context.roles)) {
    redirect("/unauthorized" as Route);
  }

  const client = await createAuthServerClient();
  return (
    <FrontendDashboardPage
      canViewInventory={hasPermission(context, ASSETS_PERMISSIONS.READ)}
      client={client}
      persona={persona}
    />
  );
}
