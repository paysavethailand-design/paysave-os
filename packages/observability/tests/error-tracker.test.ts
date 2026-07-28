import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConsoleOperationalErrorTracker,
  reportUnhandledRouteError,
  resetOperationalErrorTracker,
  setOperationalErrorTracker,
  type OperationalErrorEvent,
  type OperationalErrorTracker,
} from "../src/error-tracker";

afterEach(() => resetOperationalErrorTracker());

describe("operational error tracking", () => {
  it("records structured fields without raw error messages", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setOperationalErrorTracker(new ConsoleOperationalErrorTracker());
    reportUnhandledRouteError({
      correlationId: "corr-1",
      method: "GET",
      path: "/api/v1/users",
      status: 500,
      code: "internal_error",
      error: new Error("secret-token-should-never-be-logged"),
    });
    const output = String(errorSpy.mock.calls[0]?.[0]);
    expect(output).not.toContain("secret-token-should-never-be-logged");
    expect(JSON.parse(output)).toMatchObject({
      type: "unhandled_route_error",
      correlationId: "corr-1",
      errorType: "Error",
    });
    errorSpy.mockRestore();
  });

  it("supports a test tracker adapter", () => {
    const events: OperationalErrorEvent[] = [];
    const tracker: OperationalErrorTracker = {
      captureUnhandledRouteError: (event) => events.push(event),
    };
    setOperationalErrorTracker(tracker);
    reportUnhandledRouteError({
      correlationId: "c",
      method: "POST",
      path: "/x",
      status: 500,
      code: "internal_error",
      error: { name: "SyntheticError" },
    });
    expect(events).toEqual([
      {
        correlationId: "c",
        method: "POST",
        path: "/x",
        status: 500,
        code: "internal_error",
        errorType: "SyntheticError",
      },
    ]);
  });
});
