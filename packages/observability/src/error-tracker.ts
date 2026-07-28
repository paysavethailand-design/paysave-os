export interface OperationalErrorContext {
  correlationId: string;
  method: string;
  path: string;
  status: number;
  code: string;
}

export interface OperationalErrorTracker {
  captureUnhandledRouteError(context: OperationalErrorContext & { errorType: string }): void;
}

export interface OperationalErrorEvent extends OperationalErrorContext {
  errorType: string;
}

const DEFAULT_ERROR_TYPE = "UnknownError";
export class ConsoleOperationalErrorTracker implements OperationalErrorTracker {
  captureUnhandledRouteError(context: OperationalErrorEvent): void {
    const payload = {
      type: "unhandled_route_error",
      correlationId: context.correlationId,
      method: context.method,
      path: context.path,
      status: context.status,
      code: context.code,
      errorType: context.errorType,
    };

    console.error(JSON.stringify(payload));
  }
}

export class NoopOperationalErrorTracker implements OperationalErrorTracker {
  captureUnhandledRouteError(): void {
    return;
  }
}

let operationalErrorTracker: OperationalErrorTracker = new ConsoleOperationalErrorTracker();

export function setOperationalErrorTracker(tracker: OperationalErrorTracker): void {
  operationalErrorTracker = tracker;
}

export function resetOperationalErrorTracker(): void {
  operationalErrorTracker = new ConsoleOperationalErrorTracker();
}

function detectErrorType(error: unknown): string {
  if (error instanceof Error) {
    return error.name || "Error";
  }

  if (typeof error === "object" && error !== null && "name" in error) {
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }

  return DEFAULT_ERROR_TYPE;
}

export function reportUnhandledRouteError(
  context: OperationalErrorContext & {
    error: unknown;
  },
): void {
  operationalErrorTracker.captureUnhandledRouteError({
    correlationId: context.correlationId,
    method: context.method,
    path: context.path,
    status: context.status,
    code: context.code,
    errorType: detectErrorType(context.error),
  });
}
