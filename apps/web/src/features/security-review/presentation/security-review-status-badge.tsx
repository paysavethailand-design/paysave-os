import { Badge } from "@paysave/ui";
import type { SecurityReviewStatus } from "../domain/security-review";

export function SecurityReviewStatusBadge({ status }: { readonly status: SecurityReviewStatus }) {
  const variant = status === "PASS" ? "success" : status === "FAIL" ? "danger" : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}
