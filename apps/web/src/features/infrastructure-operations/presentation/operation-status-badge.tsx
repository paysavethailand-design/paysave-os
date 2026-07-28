import { Badge } from "@paysave/ui";
import type { InfrastructureOperationAvailability } from "../domain/infrastructure-operations";

export function OperationStatusBadge({
  availability,
}: {
  readonly availability: InfrastructureOperationAvailability;
}) {
  const variant =
    availability === "SUPPORTED"
      ? "success"
      : availability === "PARTIAL" || availability === "EXPERIMENTAL"
        ? "warning"
        : "neutral";
  return <Badge variant={variant}>{availability}</Badge>;
}
