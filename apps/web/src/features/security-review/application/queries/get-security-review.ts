import type {
  SecurityReviewCategory,
  SecurityReviewCheckSnapshot,
  SecurityReviewRepository,
} from "../ports/security-review-repository";
import type {
  SecurityReviewCheck,
  SecurityReviewModel,
  SecurityReviewStatus,
} from "../../domain/security-review";

const CATEGORIES: readonly SecurityReviewCategory[] = [
  "architecture-boundary",
  "layer-isolation",
  "provider-isolation",
  "secret-exposure",
  "permission-boundary",
];

const CATEGORY_LABELS: Readonly<Record<SecurityReviewCategory, string>> = {
  "architecture-boundary": "Architecture Boundary Status",
  "layer-isolation": "Layer Isolation Review",
  "provider-isolation": "Provider Isolation Review",
  "secret-exposure": "Secret Exposure Review",
  "permission-boundary": "Permission Boundary Review",
};

function status(outcome: SecurityReviewCheckSnapshot["outcome"]): SecurityReviewStatus {
  if (outcome === "valid") return "PASS";
  if (outcome === "invalid") return "FAIL";
  return "UNKNOWN";
}

function project(check: SecurityReviewCheckSnapshot): SecurityReviewCheck {
  return {
    id: check.id,
    status: status(check.outcome),
    code: check.code,
    title: check.title,
    detail: check.detail,
    evidence: [...check.evidence],
  };
}

function unavailable(category: SecurityReviewCategory): SecurityReviewCheckSnapshot {
  return {
    id: `${category}-unavailable`,
    category,
    outcome: "unknown",
    code: "SECURITY_REVIEW_EVIDENCE_UNAVAILABLE",
    title: CATEGORY_LABELS[category],
    detail: "Security Validator or Read Model evidence is unavailable; compliance is not assumed.",
    evidence: [],
    findings: [],
  };
}

export async function getSecurityReview(
  repository: SecurityReviewRepository,
): Promise<SecurityReviewModel> {
  let generatedAt = new Date(0).toISOString();
  let checks: readonly SecurityReviewCheckSnapshot[];

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
  const passed = projected.filter((check) => check.status === "PASS").length;
  const failed = projected.filter((check) => check.status === "FAIL").length;
  const unknown = projected.filter((check) => check.status === "UNKNOWN").length;
  const complianceStatus: SecurityReviewStatus =
    failed > 0 ? "FAIL" : unknown > 0 ? "UNKNOWN" : "PASS";
  const securityFindings = normalized.flatMap((check) => check.findings);
  const forCategory = (category: SecurityReviewCategory) =>
    normalized.filter((check) => check.category === category).map(project);

  return {
    generatedAt,
    architectureBoundaryStatus: forCategory("architecture-boundary"),
    layerIsolationReview: forCategory("layer-isolation"),
    providerIsolationReview: forCategory("provider-isolation"),
    secretExposureReview: forCategory("secret-exposure"),
    permissionBoundaryReview: forCategory("permission-boundary"),
    securityFindings: securityFindings.map((finding) => ({ ...finding })),
    complianceStatus: {
      status: complianceStatus,
      passed,
      failed,
      unknown,
      total: projected.length,
      findings: securityFindings.length,
      detail:
        complianceStatus === "PASS"
          ? "All required Security Validator and Read Model checks passed."
          : complianceStatus === "FAIL"
            ? "One or more Security Validator or Read Model checks failed."
            : "One or more required security outcomes are unavailable or unconfirmed.",
    },
  };
}
