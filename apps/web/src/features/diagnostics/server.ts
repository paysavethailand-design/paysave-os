import "server-only";
import { getDiagnostics } from "./application/queries/get-diagnostics";
import { Stage52DiagnosticsRepository } from "./infrastructure/stage52-diagnostics-repository";

export async function loadDiagnostics() {
  return getDiagnostics(new Stage52DiagnosticsRepository());
}
