import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateLoadResult, percentile } from "./load-test.mjs";

test("percentile returns deterministic nearest-rank latency", () => {
  assert.equal(percentile([30, 10, 20, 40], 0.95), 40);
  assert.equal(percentile([30, 10, 20, 40], 0.5), 20);
});

test("load result passes within latency and error thresholds", () => {
  const result = evaluateLoadResult([100, 120, 140, 160], 0, { p95Ms: 200, maxErrorRate: 0 });
  assert.equal(result.status, "PASS");
  assert.equal(result.p95Ms, 160);
});

test("load result fails closed on errors or excessive p95", () => {
  assert.equal(evaluateLoadResult([100, 900], 0, { p95Ms: 500, maxErrorRate: 0 }).status, "FAIL");
  assert.equal(evaluateLoadResult([100, 110], 1, { p95Ms: 500, maxErrorRate: 0 }).status, "FAIL");
});
