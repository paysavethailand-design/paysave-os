import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  incrementUnhandledRouteErrors,
  reportRouteRequest,
  reportUnhandledRouteError,
} from "@paysave/observability";
import { ApiError, type ApiErrorDetail } from "./api-error";

export interface ApiMeta {
  readonly correlationId: string;
  readonly nextCursor?: string | null;
}

interface ApiSuccessBody<T> {
  readonly data: T;
  readonly meta: ApiMeta;
}

interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: readonly ApiErrorDetail[];
  };
  readonly meta: ApiMeta;
}

/** Resolves a stable correlation ID for the request, generating one when the caller omits it. */
export function resolveCorrelationId(request: NextRequest): string {
  return request.headers.get("x-correlation-id") ?? randomUUID();
}

/** Parses the request body as JSON, failing with a 422 instead of an opaque 500 on malformed input. */
export async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("validation_failed", "Request body must be valid JSON");
  }
}

/** Same as {@link readJsonBody}, but treats a missing/empty body as `{}` (for DELETE requests with an optional reason). */
export async function readOptionalJsonBody(request: NextRequest): Promise<unknown> {
  const text = await request.text();
  if (text.trim().length === 0) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("validation_failed", "Request body must be valid JSON");
  }
}

/** Shapes a successful /api/v1 response envelope. */
export function apiOk<T>(
  data: T,
  correlationId: string,
  options?: { readonly status?: number; readonly nextCursor?: string | null },
): NextResponse<ApiSuccessBody<T>> {
  const meta: ApiMeta =
    options?.nextCursor === undefined
      ? { correlationId }
      : { correlationId, nextCursor: options.nextCursor };

  return NextResponse.json({ data, meta }, { status: options?.status ?? 200 });
}

/** Shapes a 201 Created /api/v1 response envelope. */
export function apiCreated<T>(data: T, correlationId: string): NextResponse<ApiSuccessBody<T>> {
  return apiOk(data, correlationId, { status: 201 });
}

function zodIssuesToDetails(error: ZodError): readonly ApiErrorDetail[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Maps any thrown error to the standardized error envelope; never leaks internals to clients. */
export function apiErrorFromUnknown(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof ZodError) {
    return new ApiError(
      "validation_failed",
      "Request validation failed",
      zodIssuesToDetails(error),
    );
  }

  return new ApiError("internal_error", "Unexpected server error");
}

function apiErrorResponse(error: ApiError, correlationId: string): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
      meta: { correlationId },
    },
    { status: error.status },
  );
}

/**
 * Wraps a static (non-dynamic-segment) Route Handler with correlation IDs and standardized error
 * mapping. Route Handlers stay thin: parse input, delegate to a Feature's `server.ts` public API,
 * shape the response.
 */
export function withApiRoute(
  handler: (request: NextRequest, correlationId: string) => Promise<NextResponse>,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest) => {
    const correlationId = resolveCorrelationId(request);
    const startedAt = performance.now();
    let response: NextResponse;
    try {
      response = await handler(request, correlationId);
    } catch (error) {
      const apiError = apiErrorFromUnknown(error);
      if (apiError.code === "internal_error") {
        incrementUnhandledRouteErrors();
        reportUnhandledRouteError({
          correlationId,
          method: request.method,
          path: request.nextUrl.pathname,
          status: apiError.status,
          code: apiError.code,
          error,
        });
      }
      response = apiErrorResponse(apiError, correlationId);
    }
    reportRouteRequest({
      correlationId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
    return response;
  };
}

/** Same as {@link withApiRoute}, for Route Handlers with a dynamic segment (`params` is a Promise in Next.js 15). */
export function withApiParamsRoute<TParams extends object>(
  handler: (request: NextRequest, params: TParams, correlationId: string) => Promise<NextResponse>,
): (request: NextRequest, context: { params: Promise<TParams> }) => Promise<NextResponse> {
  return async (request: NextRequest, context: { params: Promise<TParams> }) => {
    const correlationId = resolveCorrelationId(request);
    const startedAt = performance.now();
    let response: NextResponse;
    try {
      const params = await context.params;
      response = await handler(request, params, correlationId);
    } catch (error) {
      const apiError = apiErrorFromUnknown(error);
      if (apiError.code === "internal_error") {
        incrementUnhandledRouteErrors();
        reportUnhandledRouteError({
          correlationId,
          method: request.method,
          path: request.nextUrl.pathname,
          status: apiError.status,
          code: apiError.code,
          error,
        });
      }
      response = apiErrorResponse(apiError, correlationId);
    }
    reportRouteRequest({
      correlationId,
      method: request.method,
      path: request.nextUrl.pathname,
      status: response.status,
      durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
    });
    return response;
  };
}
