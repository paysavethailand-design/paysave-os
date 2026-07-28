type OperationalMetricRecord = {
  healthzRequests: number;
  readyzRequests: number;
  versionRequests: number;
  metricsRequests: number;
  unhandledRouteErrors: number;
  readinessStatus: 0 | 1;
};

const METRIC_STATE: OperationalMetricRecord = {
  healthzRequests: 0,
  readyzRequests: 0,
  versionRequests: 0,
  metricsRequests: 0,
  unhandledRouteErrors: 0,
  readinessStatus: 0,
};

const STARTED_AT_MS = Date.now();

const METRIC_HELP = {
  paysave_healthz_requests_total: "Number of /healthz invocations observed since process start.",
  paysave_readyz_requests_total: "Number of /readyz invocations observed since process start.",
  paysave_version_requests_total: "Number of /version invocations observed since process start.",
  paysave_metrics_requests_total: "Number of /metrics invocations observed since process start.",
  paysave_unhandled_route_errors_total:
    "Number of internal route errors captured by structured error tracking since process start.",
  paysave_readiness_status: "Latest config-only readiness result: 1 ready, 0 not ready or unknown.",
  paysave_process_uptime_seconds: "Process uptime in seconds.",
} as const;

export function incrementHealthzRequests(): void {
  METRIC_STATE.healthzRequests += 1;
}

export function incrementReadyzRequests(): void {
  METRIC_STATE.readyzRequests += 1;
}

export function incrementVersionRequests(): void {
  METRIC_STATE.versionRequests += 1;
}

export function incrementMetricsRequests(): void {
  METRIC_STATE.metricsRequests += 1;
}

export function incrementUnhandledRouteErrors(): void {
  METRIC_STATE.unhandledRouteErrors += 1;
}

export function setReadinessStatus(ready: boolean): void {
  METRIC_STATE.readinessStatus = ready ? 1 : 0;
}

export function readOperationalMetricsState(): OperationalMetricRecord {
  return { ...METRIC_STATE };
}

export function resetOperationalMetrics(): void {
  METRIC_STATE.healthzRequests = 0;
  METRIC_STATE.readyzRequests = 0;
  METRIC_STATE.versionRequests = 0;
  METRIC_STATE.metricsRequests = 0;
  METRIC_STATE.unhandledRouteErrors = 0;
  METRIC_STATE.readinessStatus = 0;
}

export function collectPrometheusMetricsText(nowMs: number = Date.now()): string {
  const lines: string[] = [];

  const metricValue = (
    name: keyof typeof METRIC_HELP,
    value: number,
    type: "counter" | "gauge",
  ) => {
    lines.push(`# HELP ${name} ${METRIC_HELP[name]}`);
    lines.push(`# TYPE ${name} ${type}`);
    lines.push(`${name} ${value}`);
  };

  metricValue("paysave_healthz_requests_total", METRIC_STATE.healthzRequests, "counter");
  metricValue("paysave_readyz_requests_total", METRIC_STATE.readyzRequests, "counter");
  metricValue("paysave_version_requests_total", METRIC_STATE.versionRequests, "counter");
  metricValue("paysave_metrics_requests_total", METRIC_STATE.metricsRequests, "counter");
  metricValue("paysave_unhandled_route_errors_total", METRIC_STATE.unhandledRouteErrors, "counter");
  metricValue("paysave_readiness_status", METRIC_STATE.readinessStatus, "gauge");

  const uptimeSeconds = (nowMs - STARTED_AT_MS) / 1000;
  metricValue("paysave_process_uptime_seconds", Number(uptimeSeconds.toFixed(3)), "gauge");

  return lines.join("\n") + "\n";
}
