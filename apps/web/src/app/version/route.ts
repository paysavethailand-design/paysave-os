import { incrementVersionRequests } from "@paysave/observability";
import { NextResponse } from "next/server";
import { buildVersionPayload, type VersionPayload } from "./version";

export const dynamic = "force-dynamic";

export function GET(): NextResponse<VersionPayload> {
  incrementVersionRequests();
  return NextResponse.json(buildVersionPayload(), {
    headers: { "cache-control": "no-store" },
  });
}
