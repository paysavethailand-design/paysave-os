import { incrementHealthzRequests } from "@paysave/observability";
import { NextResponse } from "next/server";
import { buildHealthzPayload, type HealthzPayload } from "./health";

export const dynamic = "force-dynamic";

export function GET(): NextResponse<HealthzPayload> {
  incrementHealthzRequests();
  return NextResponse.json(buildHealthzPayload());
}
