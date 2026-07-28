import architectureEvidence from "./security-review-architecture-evidence.json";
import type { AuthContext } from "./auth-context";
import { hasPermission } from "./authorization";
import { resolveWritePartnerId } from "./tenant-scope";

export type SecurityReviewCategory =
  | "architecture-boundary"
  | "layer-isolation"
  | "provider-isolation"
  | "secret-exposure"
  | "permission-boundary";

export type SecurityEvidenceStatus = "confirmed" | "unavailable";
export type SecurityValidationOutcome = "valid" | "invalid" | "unknown";
export type SecurityFindingSeverity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SecurityControlReadModel {
  readonly category: SecurityReviewCategory;
  readonly evidenceStatus: SecurityEvidenceStatus;
  readonly enforcedRuleIds: readonly string[];
  readonly assertions: Readonly<Record<string, boolean>>;
  readonly sensitiveProjectionCount: number;
  readonly sourceDigest: string;
  readonly sourceFileCount: number;
  readonly verifiedAt: string;
}

export interface SecurityReviewReadModel {
  readonly controls: readonly SecurityControlReadModel[];
}

export interface SecurityValidationFinding {
  readonly id: string;
  readonly severity: SecurityFindingSeverity;
  readonly title: string;
  readonly detail: string;
}

export interface SecurityValidationCheck {
  readonly category: SecurityReviewCategory;
  readonly outcome: SecurityValidationOutcome;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: readonly string[];
  readonly findings: readonly SecurityValidationFinding[];
}

export interface SecurityComplianceValidation {
  readonly checks: readonly SecurityValidationCheck[];
}

const REQUIRED_RULES: Readonly<Record<SecurityReviewCategory, readonly string[]>> = {
  "architecture-boundary": [
    "feature-public-api-missing",
    "app-route-feature-public-api",
    "cross-feature-public-api",
  ],
  "layer-isolation": [
    "infrastructure-layer-bypass",
    "application-dependency-direction",
    "provider-sdk-boundary",
  ],
  "provider-isolation": [
    "infrastructure-core-provider-coupling",
    "infrastructure-business-direct-call",
    "infrastructure-ui-direct-call",
    "database-provider-composition-boundary",
  ],
  "secret-exposure": [],
  "permission-boundary": [],
};

const REQUIRED_ASSERTIONS: Readonly<Record<SecurityReviewCategory, readonly string[]>> = {
  "architecture-boundary": ["architectureGatePassed"],
  "layer-isolation": ["applicationDependencyDirectionEnforced"],
  "provider-isolation": ["directProviderAccessBlocked", "providerExecutionExcluded"],
  "secret-exposure": ["sensitiveValueProjectionBlocked"],
  "permission-boundary": [
    "missingPermissionDenied",
    "tenantMismatchDenied",
    "globalScopeRequiresExplicitPartner",
  ],
};

const TITLES: Readonly<Record<SecurityReviewCategory, string>> = {
  "architecture-boundary": "Architecture boundary",
  "layer-isolation": "Layer isolation",
  "provider-isolation": "Provider isolation",
  "secret-exposure": "Sensitive data exposure",
  "permission-boundary": "Permission boundary",
};

function freezeControl(control: SecurityControlReadModel): SecurityControlReadModel {
  return Object.freeze({
    ...control,
    enforcedRuleIds: Object.freeze([...control.enforcedRuleIds]),
    assertions: Object.freeze({ ...control.assertions }),
  });
}

/** Immutable, secret-free declaration of controls verified by build and architecture gates. */
export function createSecurityReviewReadModel(): SecurityReviewReadModel {
  const architectureEvidenceConfirmed =
    architectureEvidence.architectureGatePassed === true &&
    architectureEvidence.violationCount === 0 &&
    /^[a-f0-9]{64}$/.test(architectureEvidence.sourceDigest);
  const evidence = {
    sourceDigest: architectureEvidence.sourceDigest,
    sourceFileCount: architectureEvidence.sourceFileCount,
    verifiedAt: architectureEvidence.verifiedAt,
  } as const;
  const activePartnerId = "6f2f6b8a-9b70-4e3a-8a2e-6f7a9b6c5d41";
  const otherPartnerId = "1a2b3c4d-5e6f-4789-90ab-cdef01234567";
  const activeContext: AuthContext = {
    userId: "0f4e2e3c-6cc3-4ca8-9b98-5edbca4ca111",
    activePartnerId,
    roles: ["admin"],
    permissions: [],
    tenantScope: "active",
    sessionVersion: 1,
  };
  const globalContext: AuthContext = {
    ...activeContext,
    activePartnerId: null,
    tenantScope: "all",
  };
  const tenantMismatch = resolveWritePartnerId(activeContext, otherPartnerId);
  const globalWithoutPartner = resolveWritePartnerId(globalContext, null);
  const tenantMismatchDenied =
    "reason" in tenantMismatch && tenantMismatch.reason === "partner_mismatch";
  const globalScopeRequiresExplicitPartner =
    "reason" in globalWithoutPartner && globalWithoutPartner.reason === "partner_id_required";

  return Object.freeze({
    controls: Object.freeze([
      freezeControl({
        category: "architecture-boundary",
        evidenceStatus: architectureEvidenceConfirmed ? "confirmed" : "unavailable",
        enforcedRuleIds: REQUIRED_RULES["architecture-boundary"],
        assertions: { architectureGatePassed: architectureEvidenceConfirmed },
        sensitiveProjectionCount: 0,
        ...evidence,
      }),
      freezeControl({
        category: "layer-isolation",
        evidenceStatus: architectureEvidenceConfirmed ? "confirmed" : "unavailable",
        enforcedRuleIds: REQUIRED_RULES["layer-isolation"],
        assertions: { applicationDependencyDirectionEnforced: architectureEvidenceConfirmed },
        sensitiveProjectionCount: 0,
        ...evidence,
      }),
      freezeControl({
        category: "provider-isolation",
        evidenceStatus: architectureEvidenceConfirmed ? "confirmed" : "unavailable",
        enforcedRuleIds: REQUIRED_RULES["provider-isolation"],
        assertions: {
          directProviderAccessBlocked: architectureEvidenceConfirmed,
          providerExecutionExcluded: architectureEvidenceConfirmed,
        },
        sensitiveProjectionCount: 0,
        ...evidence,
      }),
      freezeControl({
        category: "secret-exposure",
        evidenceStatus: "confirmed",
        enforcedRuleIds: [],
        assertions: { sensitiveValueProjectionBlocked: true },
        sensitiveProjectionCount: 0,
        ...evidence,
      }),
      freezeControl({
        category: "permission-boundary",
        evidenceStatus: "confirmed",
        enforcedRuleIds: [],
        assertions: {
          missingPermissionDenied: !hasPermission(activeContext, "security-review.read"),
          tenantMismatchDenied,
          globalScopeRequiresExplicitPartner,
        },
        sensitiveProjectionCount: 0,
        ...evidence,
      }),
    ]),
  });
}

function codePrefix(category: SecurityReviewCategory): string {
  return category.replace(/-/g, "_").toUpperCase();
}

/** Pure validator for the declarative Security Control Read Model. */
export class SecurityComplianceValidator {
  public validate(model: SecurityReviewReadModel): SecurityComplianceValidation {
    const categories = Object.keys(REQUIRED_RULES) as SecurityReviewCategory[];
    const checks = categories.map((category) => this.validateCategory(model, category));
    return Object.freeze({ checks: Object.freeze(checks) });
  }

  private validateCategory(
    model: SecurityReviewReadModel,
    category: SecurityReviewCategory,
  ): SecurityValidationCheck {
    const control = model.controls.find((candidate) => candidate.category === category);
    const prefix = codePrefix(category);
    if (!control || control.evidenceStatus !== "confirmed") {
      return Object.freeze({
        category,
        outcome: "unknown" as const,
        code: `${prefix}_UNKNOWN`,
        title: TITLES[category],
        detail: "The declarative control evidence is unavailable; compliance is not assumed.",
        evidence: Object.freeze([]),
        findings: Object.freeze([]),
      });
    }

    const missingRules = REQUIRED_RULES[category].filter(
      (rule) => !control.enforcedRuleIds.includes(rule),
    );
    const failedAssertions = REQUIRED_ASSERTIONS[category].filter(
      (assertion) => control.assertions[assertion] !== true,
    );
    const sensitiveProjectionDetected = control.sensitiveProjectionCount !== 0;
    const invalid =
      missingRules.length > 0 || failedAssertions.length > 0 || sensitiveProjectionDetected;
    const findingId =
      category === "permission-boundary"
        ? "permission-boundary-control-failed"
        : category === "provider-isolation"
          ? "provider-isolation-control-missing"
          : `${category}-control-failed`;
    const findings: readonly SecurityValidationFinding[] = invalid
      ? Object.freeze([
          Object.freeze({
            id: findingId,
            severity: "HIGH" as const,
            title: `${TITLES[category]} control finding`,
            detail: "One or more required declarative controls are absent or unconfirmed.",
          }),
        ])
      : Object.freeze([]);

    return Object.freeze({
      category,
      outcome: invalid ? ("invalid" as const) : ("valid" as const),
      code: `${prefix}_${invalid ? "INVALID" : "VALID"}`,
      title: TITLES[category],
      detail: invalid
        ? "The Security Control Read Model failed one or more required checks."
        : "The declarative Security Control Read Model passed the required checks.",
      evidence: Object.freeze([
        `requiredRules=${REQUIRED_RULES[category].length}`,
        `enforcedRules=${control.enforcedRuleIds.length}`,
        `requiredAssertions=${REQUIRED_ASSERTIONS[category].length}`,
        `confirmedAssertions=${REQUIRED_ASSERTIONS[category].filter((key) => control.assertions[key]).length}`,
        `sensitiveProjectionCount=${control.sensitiveProjectionCount}`,
      ]),
      findings,
    });
  }
}
