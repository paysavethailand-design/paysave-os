import { resolveWritePartnerId, type AuthContext } from "@paysave/security";
import { ApiError } from "@/shared/lib/api-error";
import type { Clock } from "../ports/clock";
import type { InventoryAnalyticsRepository } from "../ports/inventory-analytics-repository";
import {
  projectInventoryDashboard,
  type InventoryDashboardModel,
} from "./project-inventory-dashboard";

/** Loads tenant-scoped source rows and derives dashboard values without writing to the database. */
export async function getInventoryDashboard(
  requestedPartnerId: string | null,
  actor: AuthContext,
  repository: InventoryAnalyticsRepository,
  clock: Clock,
): Promise<InventoryDashboardModel> {
  const scope = resolveWritePartnerId(actor, requestedPartnerId);
  if (!scope.ok) {
    throw new ApiError("forbidden", `Cannot resolve target partner: ${scope.reason}`);
  }

  const snapshot = await repository.loadSnapshot(scope.partnerId);
  return projectInventoryDashboard({ ...snapshot, now: clock.now() });
}
