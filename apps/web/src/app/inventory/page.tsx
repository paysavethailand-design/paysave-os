import { requirePermission } from "@/features/auth/server";
import { InventoryDashboardView } from "@/features/assets";
import { ASSETS_PERMISSIONS, getInventoryDashboardUseCase } from "@/features/assets/server";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const actor = await requirePermission(ASSETS_PERMISSIONS.READ, "/inventory");
  const model = await getInventoryDashboardUseCase(null, actor);
  return <InventoryDashboardView model={model} />;
}
