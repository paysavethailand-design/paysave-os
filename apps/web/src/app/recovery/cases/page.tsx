import { CaseListView } from "@/features/recovery-management";
import { requirePermission } from "@/features/auth/server";
import { RECOVERY_PERMISSIONS } from "@/features/recovery-core";

export default async function RecoveryCasesPage() {
  // Production-grade permission guard (maps to role via DB RBAC + claims)
  await requirePermission(RECOVERY_PERMISSIONS.CASES_READ, "/recovery/cases");
  return <CaseListView />;
}
