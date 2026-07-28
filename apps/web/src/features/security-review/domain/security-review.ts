import type { SecurityFindingSeverity } from "../application/ports/security-review-repository";

export type SecurityReviewStatus = "PASS" | "FAIL" | "UNKNOWN";

export interface SecurityReviewCheck {
  readonly id: string;
  readonly status: SecurityReviewStatus;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: readonly string[];
}

export interface SecurityFinding {
  readonly id: string;
  readonly severity: SecurityFindingSeverity;
  readonly title: string;
  readonly detail: string;
}

export interface ComplianceStatus {
  readonly status: SecurityReviewStatus;
  readonly passed: number;
  readonly failed: number;
  readonly unknown: number;
  readonly total: number;
  readonly findings: number;
  readonly detail: string;
}

export interface SecurityReviewModel {
  readonly generatedAt: string;
  readonly architectureBoundaryStatus: readonly SecurityReviewCheck[];
  readonly layerIsolationReview: readonly SecurityReviewCheck[];
  readonly providerIsolationReview: readonly SecurityReviewCheck[];
  readonly secretExposureReview: readonly SecurityReviewCheck[];
  readonly permissionBoundaryReview: readonly SecurityReviewCheck[];
  readonly securityFindings: readonly SecurityFinding[];
  readonly complianceStatus: ComplianceStatus;
}
