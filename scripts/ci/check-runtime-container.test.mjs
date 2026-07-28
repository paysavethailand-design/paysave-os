import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateRuntimeDockerfile } from "./check-runtime-container.mjs";

const SAFE_RUNNER = `
FROM node:24-alpine AS runner
RUN rm -rf /usr/local/lib/node_modules/npm \\
  /usr/local/bin/npm \\
  /usr/local/bin/npx
USER paysave
CMD ["node", "apps/web/server.js"]
`;

test("accepts a non-root runtime without npm tooling", () => {
  assert.deepEqual(evaluateRuntimeDockerfile(SAFE_RUNNER), []);
});

test("rejects a runtime that retains npm tooling", () => {
  assert.deepEqual(evaluateRuntimeDockerfile("FROM node:24-alpine AS runner\nUSER paysave\n"), [
    "runner must remove npm and npx tooling",
  ]);
});

test("rejects a root runtime", () => {
  assert.deepEqual(
    evaluateRuntimeDockerfile(
      "FROM node:24-alpine AS runner\nRUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx\n",
    ),
    ["runner must set a non-root USER"],
  );
});

test("does not accept npm removal or USER declarations from a later stage", () => {
  const source = `
FROM node:24-alpine AS runner
CMD ["node", "server.js"]
FROM node:24-alpine AS debug
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
USER paysave
`;

  assert.deepEqual(evaluateRuntimeDockerfile(source), [
    "runner must remove npm and npx tooling",
    "runner must set a non-root USER",
  ]);
});
