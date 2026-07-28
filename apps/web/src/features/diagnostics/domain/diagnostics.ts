export type DiagnosticsStatus = "PASS" | "FAIL" | "UNKNOWN";

export interface DiagnosticsCheck {
  readonly id: string;
  readonly status: DiagnosticsStatus;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly evidence: readonly string[];
}

export interface SystemIntegritySummary {
  readonly status: DiagnosticsStatus;
  readonly passed: number;
  readonly failed: number;
  readonly unknown: number;
  readonly total: number;
  readonly detail: string;
}

export interface DiagnosticsModel {
  readonly generatedAt: string;
  readonly systemIntegrity: SystemIntegritySummary;
  readonly registryDiagnostics: readonly DiagnosticsCheck[];
  readonly capabilityValidation: readonly DiagnosticsCheck[];
  readonly environmentValidation: readonly DiagnosticsCheck[];
  readonly configurationValidation: readonly DiagnosticsCheck[];
  readonly readModelValidation: readonly DiagnosticsCheck[];
}
