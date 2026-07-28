import { dashboardPersonas, FrontendDashboardPage } from "@/features/frontend-dashboard";
interface PageProps {
  readonly params: Promise<{ persona: string }>;
}
export function generateStaticParams() {
  return dashboardPersonas.map((persona) => ({ persona }));
}
export default async function DashboardPersonaPage({ params }: PageProps) {
  const { persona } = await params;
  return <FrontendDashboardPage persona={persona} />;
}
