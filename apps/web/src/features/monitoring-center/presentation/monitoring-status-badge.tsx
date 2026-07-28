import { Badge } from "@paysave/ui";

export function MonitoringStatusBadge({ status }: { readonly status: string }) {
  const variant =
    status === "HEALTHY" || status === "CONFIGURED" || status === "READY"
      ? "success"
      : status === "DEGRADED" || status === "WARNING"
        ? "warning"
        : status === "UNHEALTHY" || status === "ERROR"
          ? "danger"
          : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}
