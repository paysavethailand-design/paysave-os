import test from "node:test";
import assert from "node:assert/strict";
import { evaluateDependencyBaseline } from "./check-dependency-baseline.mjs";

test("rejects vulnerable Next transitive copies even when root versions are patched", () => {
  assert.deepEqual(
    evaluateDependencyBaseline({
      "node_modules/postcss": { version: "8.5.20" },
      "node_modules/sharp": { version: "0.35.0" },
      "node_modules/next/node_modules/postcss": { version: "8.4.31" },
      "node_modules/next/node_modules/sharp": { version: "0.34.5" },
    }),
    [
      "node_modules/next/node_modules/postcss must be >= 8.5.10 (found 8.4.31)",
      "node_modules/next/node_modules/sharp must be >= 0.35.0 (found 0.34.5)",
    ],
  );
});

test("accepts patched root versions when Next has no nested copies", () => {
  assert.deepEqual(
    evaluateDependencyBaseline({
      "node_modules/postcss": { version: "8.5.20" },
      "node_modules/sharp": { version: "0.35.0" },
    }),
    [],
  );
});

test("fails closed when required root dependency metadata is missing", () => {
  assert.deepEqual(evaluateDependencyBaseline({}), [
    "node_modules/postcss is missing from package-lock.json",
    "node_modules/sharp is missing from package-lock.json",
  ]);
});
