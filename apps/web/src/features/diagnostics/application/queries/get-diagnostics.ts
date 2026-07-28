import type {
  DiagnosticsCategory,
  DiagnosticsCheckSnapshot,
  DiagnosticsRepository,
} from "../ports/diagnostics-repository";
import type {
  DiagnosticsCheck,
  DiagnosticsModel,
  DiagnosticsStatus,
} from "../../domain/diagnostics";

const CATEGORIES: readonly DiagnosticsCategory[] = [
  "registry",
  "capability",
  "environment",
  "configuration",
  "read-model",
];

const CATEGORY_LABELS: Readonly<Record<DiagnosticsCategory, string>> = {
  registry: "Registry Diagnostics",
  capability: "Capability Validation",
  environment: "Environment Validation",
  configuration: "Configuration Validation",
  "read-model": "Read Model Validation",
};

function status(outcome: DiagnosticsCheckSnapshot["outcome"]): DiagnosticsStatus {
  if (outcome === "valid") return "PASS";
  if (outcome === "invalid") return "FAIL";
  return "UNKNOWN";
}

function project(check: DiagnosticsCheckSnapshot): DiagnosticsCheck {
  return {
    id: check.id,
    status: status(check.outcome),
    code: check.code,
    title: check.title,
    detail: check.detail,
    evidence: [...check.evidence],
  };
}

function unavailable(category: DiagnosticsCategory): DiagnosticsCheckSnapshot {
  return {
    id: `${category}-unavailable`,
    category,
    outcome: "unknown",
    code: "DIAGNOSTICS_READ_MODEL_UNAVAILABLE",
    title: CATEGORY_LABELS[category],
    detail: "The Validator or Read Model outcome is unavailable; integrity is not assumed.",
    evidence: [],
  };
}

export async function getDiagnostics(repository: DiagnosticsRepository): Promise<DiagnosticsModel> {
  let generatedAt = new Date(0).toISOString();
  let checks: readonly DiagnosticsCheckSnapshot[];

  try {
    const snapshot = await repository.loadSnapshot();
    generatedAt = snapshot.generatedAt;
    checks = snapshot.checks;
  } catch {
    checks = CATEGORIES.map(unavailable);
  }

  const normalized = CATEGORIES.flatMap((category) => {
    const matches = checks.filter((check) => check.category === category);
    return matches.length > 0 ? matches : [unavailable(category)];
  });
  const projected = normalized.map(project);
  const failed = projected.filter((check) => check.status === "FAIL").length;
  const unknown = projected.filter((check) => check.status === "UNKNOWN").length;
  const passed = projected.filter((check) => check.status === "PASS").length;
  const summaryStatus: DiagnosticsStatus = failed > 0 ? "FAIL" : unknown > 0 ? "UNKNOWN" : "PASS";
  const forCategory = (category: DiagnosticsCategory) =>
    normalized.filter((check) => check.category === category).map(project);

  return {
    generatedAt,
    systemIntegrity: {
      status: summaryStatus,
      passed,
      failed,
      unknown,
      total: projected.length,
      detail:
        summaryStatus === "PASS"
          ? "All available Validator and Read Model checks passed."
          : summaryStatus === "FAIL"
            ? "One or more Validator or Read Model checks failed."
            : "One or more Validator or Read Model outcomes are unavailable or unconfirmed.",
    },
    registryDiagnostics: forCategory("registry"),
    capabilityValidation: forCategory("capability"),
    environmentValidation: forCategory("environment"),
    configurationValidation: forCategory("configuration"),
    readModelValidation: forCategory("read-model"),
  };
}
