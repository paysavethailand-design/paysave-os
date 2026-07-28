export type ApiErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "not_found"
  | "validation_failed"
  | "conflict"
  | "not_implemented"
  | "atomic_transaction_not_supported"
  | "internal_error";

const STATUS_BY_CODE: Readonly<Record<ApiErrorCode, number>> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation_failed: 422,
  conflict: 409,
  not_implemented: 501,
  atomic_transaction_not_supported: 501,
  internal_error: 500,
};

export interface ApiErrorDetail {
  readonly path: string;
  readonly message: string;
}

/** Standardized, framework-agnostic error for every /api/v1 route handler. */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: readonly ApiErrorDetail[];

  constructor(code: ApiErrorCode, message: string, details?: readonly ApiErrorDetail[]) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    if (details !== undefined) {
      this.details = details;
    }
  }
}
