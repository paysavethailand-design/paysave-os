import { beforeEach, describe, expect, it } from "vitest";
import {
  collectPrometheusMetricsText,
  incrementHealthzRequests,
  incrementUnhandledRouteErrors,
  readOperationalMetricsState,
  resetOperationalMetrics,
  setReadinessStatus,
} from "../src/metrics";

describe("operational metrics", () => {
  beforeEach(() => resetOperationalMetrics());

  it("records counters and emits Prometheus names", () => {
    incrementHealthzRequests();
    incrementUnhandledRouteErrors();
    setReadinessStatus(false);
    expect(readOperationalMetricsState()).toMatchObject({
      healthzRequests: 1,
      unhandledRouteErrors: 1,
      readinessStatus: 0,
    });
    const text = collectPrometheusMetricsText();
    expect(text).toContain("# TYPE paysave_healthz_requests_total counter");
    expect(text).toContain("paysave_healthz_requests_total 1");
    expect(text).toContain("paysave_unhandled_route_errors_total 1");
    expect(text).toContain("# TYPE paysave_readiness_status gauge");
    expect(text).toContain("paysave_readiness_status 0");
    expect(text).toContain("# TYPE paysave_process_uptime_seconds gauge");
  });
});
