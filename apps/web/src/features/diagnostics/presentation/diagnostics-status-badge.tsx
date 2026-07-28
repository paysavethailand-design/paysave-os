import { Badge } from "@paysave/ui";
import type { DiagnosticsStatus } from "../domain/diagnostics";

export function DiagnosticsStatusBadge({ status }: { readonly status: DiagnosticsStatus }) {
  const variant = status === "PASS" ? "success" : status === "FAIL" ? "danger" : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}
