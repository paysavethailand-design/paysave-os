export interface RequestTraceEvent {
  readonly correlationId: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;
  readonly durationMs: number;
}

export interface RequestTraceSink {
  record(event: RequestTraceEvent): void;
}

export class ConsoleRequestTraceSink implements RequestTraceSink {
  record(event: RequestTraceEvent): void {
    console.info(JSON.stringify({ type: "request_trace", ...event }));
  }
}

let requestTraceSink: RequestTraceSink = new ConsoleRequestTraceSink();

export function setRequestTraceSink(sink: RequestTraceSink): void {
  requestTraceSink = sink;
}

export function resetRequestTraceSink(): void {
  requestTraceSink = new ConsoleRequestTraceSink();
}

export function reportRouteRequest(event: RequestTraceEvent): void {
  requestTraceSink.record(event);
}
