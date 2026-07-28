import { DiagnosticsView } from "@/features/diagnostics";
import { loadDiagnostics } from "@/features/diagnostics/server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Diagnostics | PAYSAVE OS",
  description: "Read-only Infrastructure Platform validation and Read Model diagnostics.",
};

export default async function DiagnosticsPage() {
  const model = await loadDiagnostics();
  return <DiagnosticsView model={model} />;
}
