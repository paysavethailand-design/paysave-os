import { collectPrometheusMetricsText, incrementMetricsRequests } from "@paysave/observability";

export const dynamic = "force-dynamic";

export function GET(): Response {
  incrementMetricsRequests();
  return new Response(collectPrometheusMetricsText(), {
    status: 200,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; version=0.0.4; charset=utf-8",
    },
  });
}
