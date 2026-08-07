export type RecoveryApiErrorKind =
  "timeout" | "unauthorized" | "forbidden" | "dependency_failure" | "unknown";

/** Safe client-side error contract for the authenticated Recovery API. */
export class RecoveryApiError extends Error {
  constructor(
    readonly kind: RecoveryApiErrorKind,
    readonly code: string,
    message: string,
    readonly status: number | null,
    readonly correlationId: string | null,
  ) {
    super(message);
    this.name = "RecoveryApiError";
  }
}
