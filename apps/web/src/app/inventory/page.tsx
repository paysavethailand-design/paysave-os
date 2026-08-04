import { hasPermission } from "@paysave/security";
import { requirePermission } from "@/features/auth/server";
import { InventoryManagementView } from "@/features/assets";
import {
  ASSETS_PERMISSIONS,
  getInventoryDashboardUseCase,
  listAssetsUseCase,
} from "@/features/assets/server";

export const dynamic = "force-dynamic";

interface PageProps {
  readonly searchParams: Promise<{ readonly cursor?: string | readonly string[] }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cursor = typeof params.cursor === "string" ? params.cursor : null;
  const actor = await requirePermission(ASSETS_PERMISSIONS.READ, "/inventory");
  const [model, page] = await Promise.all([
    getInventoryDashboardUseCase(null, actor),
    listAssetsUseCase({ cursor, limit: 100 }, null, actor),
  ]);
  return (
    <InventoryManagementView
      assets={page.items}
      canManage={hasPermission(actor, ASSETS_PERMISSIONS.MANAGE)}
      model={model}
      nextCursor={page.nextCursor}
    />
  );
}
