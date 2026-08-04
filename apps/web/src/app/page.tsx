import { redirect } from "next/navigation";
import type { Route } from "next";
import { getAuthenticatedLandingRoute } from "@/features/auth";
import { requireAuth } from "@/features/auth/server";

/** Resolves the verified session to an existing role dashboard. */
export default async function HomePage() {
  const context = await requireAuth("/");
  redirect(getAuthenticatedLandingRoute(context.roles) as Route);
}
