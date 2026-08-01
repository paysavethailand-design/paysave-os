import { AssignmentView } from "@/features/recovery-management";
import { requirePermission } from "@/features/auth/server";
import { RECOVERY_PERMISSIONS } from "@/features/recovery-core";

export default async function RecoveryAssignmentsPage() {
  await requirePermission(RECOVERY_PERMISSIONS.ASSIGNMENTS_READ, "/recovery/assignments");
  return <AssignmentView />;
}
