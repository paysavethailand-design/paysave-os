import { CaseDetailView } from "@/features/recovery-management";
interface PageProps {
  readonly params: Promise<{ caseId: string }>;
}
export default async function RecoveryCaseDetailPage({ params }: PageProps) {
  const { caseId } = await params;
  return <CaseDetailView caseId={caseId} />;
}
