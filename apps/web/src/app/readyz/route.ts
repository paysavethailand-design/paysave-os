import { incrementReadyzRequests, setReadinessStatus } from "@paysave/observability";
import { NextResponse } from "next/server";
import { checkSupabaseDependencies } from "./dependencies";
import { buildDependencyReadinessPayload, type ReadyzPayload } from "./readiness";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse<ReadyzPayload>> {
  incrementReadyzRequests();
  const dependencyChecks = await checkSupabaseDependencies();
  const payload = buildDependencyReadinessPayload(process.env, dependencyChecks);
  setReadinessStatus(payload.status === "ready");
  return NextResponse.json(payload, { status: payload.status === "ready" ? 200 : 503 });
}
