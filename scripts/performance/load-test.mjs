import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export function percentile(values, quantile) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(quantile * sorted.length) - 1)];
}

export function evaluateLoadResult(latencies, errors, thresholds) {
  const total = latencies.length + errors;
  const p95Ms = percentile(latencies, 0.95);
  const errorRate = total === 0 ? 1 : errors / total;
  return {
    status:
      total > 0 && p95Ms <= thresholds.p95Ms && errorRate <= thresholds.maxErrorRate
        ? "PASS"
        : "FAIL",
    requests: total,
    succeeded: latencies.length,
    errors,
    errorRate,
    minMs: latencies.length ? Math.min(...latencies) : 0,
    averageMs: latencies.length
      ? Math.round((latencies.reduce((sum, value) => sum + value, 0) / latencies.length) * 100) /
        100
      : 0,
    p95Ms,
    maxMs: latencies.length ? Math.max(...latencies) : 0,
    thresholds,
  };
}

async function runLoad(target, options) {
  const latencies = [];
  let errors = 0;
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= options.requests) return;
      const started = performance.now();
      try {
        const response = await fetch(target, {
          method: "GET",
          cache: "no-store",
          redirect: "manual",
          signal: AbortSignal.timeout(options.timeoutMs),
        });
        if (response.status < 200 || response.status >= 400) throw new Error("unexpected status");
        await response.arrayBuffer();
        latencies.push(Math.round((performance.now() - started) * 100) / 100);
      } catch {
        errors += 1;
      }
    }
  }
  await Promise.all(Array.from({ length: options.concurrency }, () => worker()));
  return evaluateLoadResult(latencies, errors, options.thresholds);
}

async function main() {
  const target = process.argv[2];
  if (!target) throw new Error("Usage: load-test.mjs <https-or-local-url> [output.json]");
  const parsed = new URL(target);
  if (!new Set(["https:", "http:"]).has(parsed.protocol))
    throw new Error("HTTP(S) target required");
  const options = {
    requests: Number.parseInt(process.env.PAYSAVE_LOAD_REQUESTS || "100", 10),
    concurrency: Number.parseInt(process.env.PAYSAVE_LOAD_CONCURRENCY || "10", 10),
    timeoutMs: Number.parseInt(process.env.PAYSAVE_LOAD_TIMEOUT_MS || "5000", 10),
    thresholds: {
      p95Ms: Number.parseInt(process.env.PAYSAVE_LOAD_P95_MS || "500", 10),
      maxErrorRate: Number.parseFloat(process.env.PAYSAVE_LOAD_MAX_ERROR_RATE || "0"),
    },
  };
  const result = {
    schemaVersion: 1,
    scope: "read_only_get",
    target: `${parsed.origin}${parsed.pathname}`,
    observedAt: new Date().toISOString(),
    ...(await runLoad(target, options)),
  };
  const text = `${JSON.stringify(result, null, 2)}\n`;
  if (process.argv[3]) {
    await mkdir(dirname(process.argv[3]), { recursive: true });
    await writeFile(process.argv[3], text, "utf8");
  }
  process.stdout.write(text);
  if (result.status !== "PASS") process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
