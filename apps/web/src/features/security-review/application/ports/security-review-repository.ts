export type SecurityReviewCategory =
  | "architecture-boundary"
  | "layer-isolation"
  | "provider-isolation"
  | "secret-exposure"
  | "permission-boundary";

export type SecurityReviewOutcome = "valid" | "invalid" | "unknown";
export type SecurityFindingSeverity = "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SecurityFindingSnapshot {
  readonly id: string;
  readonly severity: SecurityFindingSeverity;
  readonly title: string;
  readonly detail: string;
}

export interface SecurityReviewCheckSnapshot {
  readonly id: string;
  readonly category: SecurityReviewCategory;
  readonly outcome: SecurityReviewOutcome;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: readonly string[];
  readonly findings: readonly SecurityFindingSnapshot[];
}

export interface SecurityReviewSnapshot {
  readonly generatedAt: string;
  readonly checks: readonly SecurityReviewCheckSnapshot[];
}

/** Application Layer port for secret-free Security Validator and Read Model outcomes. */
export interface SecurityReviewRepository {
  loadSnapshot(): Promise<SecurityReviewSnapshot>;
}
