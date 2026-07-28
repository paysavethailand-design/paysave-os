export type DiagnosticsCategory =
  "registry" | "capability" | "environment" | "configuration" | "read-model";

export type DiagnosticsOutcome = "valid" | "invalid" | "unknown";

export interface DiagnosticsCheckSnapshot {
  readonly id: string;
  readonly category: DiagnosticsCategory;
  readonly outcome: DiagnosticsOutcome;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: readonly string[];
}

export interface DiagnosticsSnapshot {
  readonly generatedAt: string;
  readonly checks: readonly DiagnosticsCheckSnapshot[];
}

/** Application Layer port for secret-free Validator and Read Model outcomes. */
export interface DiagnosticsRepository {
  loadSnapshot(): Promise<DiagnosticsSnapshot>;
}
