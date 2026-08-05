import { CaseDetailView } from "@/features/recovery-management";
import { requirePermission } from "@/features/auth/server";
import { RECOVERY_PERMISSIONS } from "@/features/recovery-core/server";
interface PageProps {
  readonly params: Promise<{ caseId: string }>;
}
export default async function RecoveryCaseDetailPage({ params }: PageProps) {
  const { caseId } = await params;
  await requirePermission(RECOVERY_PERMISSIONS.CASES_READ, `/recovery/cases/${caseId}`);
  return <CaseDetailView caseId={caseId} />;
}
