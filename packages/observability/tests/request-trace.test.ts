import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ConsoleRequestTraceSink,
  reportRouteRequest,
  resetRequestTraceSink,
  setRequestTraceSink,
  type RequestTraceEvent,
  type RequestTraceSink,
} from "../src/request-trace";

class RecordingSink implements RequestTraceSink {
  readonly events: RequestTraceEvent[] = [];
  record(event: RequestTraceEvent): void {
    this.events.push(event);
  }
}

afterEach(() => resetRequestTraceSink());

describe("request trace", () => {
  it("records correlation ID, route, status, and duration", () => {
    const sink = new RecordingSink();
    setRequestTraceSink(sink);

    reportRouteRequest({
      correlationId: "corr-1",
      method: "GET",
      path: "/api/v1/recovery/cases",
      status: 200,
      durationMs: 12,
    });

    expect(sink.events).toEqual([
      {
        correlationId: "corr-1",
        method: "GET",
        path: "/api/v1/recovery/cases",
        status: 200,
        durationMs: 12,
      },
    ]);
  });

  it("writes structured JSON without request bodies or query strings", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    new ConsoleRequestTraceSink().record({
      correlationId: "corr-2",
      method: "POST",
      path: "/api/v1/recovery/cases",
      status: 422,
      durationMs: 3,
    });

    const payload = JSON.parse(String(log.mock.calls[0]?.[0]));
    expect(payload).toEqual({
      type: "request_trace",
      correlationId: "corr-2",
      method: "POST",
      path: "/api/v1/recovery/cases",
      status: 422,
      durationMs: 3,
    });
    log.mockRestore();
  });
});
