import { Badge } from "@paysave/ui";
import type { CapabilityAvailability } from "../domain/capability-explorer";

function variant(availability: CapabilityAvailability): "success" | "warning" | "neutral" {
  if (availability === "SUPPORTED") return "success";
  if (availability === "PARTIAL" || availability === "EXPERIMENTAL") return "warning";
  return "neutral";
}

export function CapabilityStatusBadge({
  availability,
}: {
  readonly availability: CapabilityAvailability;
}) {
  return <Badge variant={variant(availability)}>{availability}</Badge>;
}
