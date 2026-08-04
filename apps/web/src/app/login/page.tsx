import { redirect } from "next/navigation";
import type { Route } from "next";
import { getAuthenticatedLandingRoute } from "@/features/auth";
import { getAuthContext } from "@/features/auth/server";

/** Keeps /sign-in as the single canonical authentication route. */
export default async function LoginPage() {
  const context = await getAuthContext();
  if (context) {
    redirect(getAuthenticatedLandingRoute(context.roles) as Route);
  }

  redirect("/sign-in");
}
