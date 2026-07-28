import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSyntheticEnvironment,
  buildCandidateDockerArgs,
  buildRollbackEvidence,
  buildRunContainerArgs,
  chooseRandomHighPort,
  parseRollbackArgs,
  redactSecrets,
  runLocalRollbackRehearsal,
  validateEnvironmentPolicy,
  validatePreviousImage,
  waitForHealth,
} from "../../../scripts/operations/rollback-drill.mjs";

test("parseRollbackArgs defaults to local-safe, canonical paths, and synthetic evidence", () => {
  const config = parseRollbackArgs([]);

  assert.equal(config.environment, "local");
  assert.equal(config.dockerfile, "docker/Dockerfile");
  assert.equal(config.projectRoot, process.cwd());
  assert.equal(typeof config.maxProbeAttempts, "number");
  assert.equal(config.maxProbeAttempts, 30);
});

test("parseRollbackArgs rejects unknown flags", () => {
  assert.throws(() => parseRollbackArgs(["--unknown"]), {
    message: /unknown argument: --unknown/,
  });
});

test("parseRollbackArgs reads supplied runtime options", () => {
  const config = parseRollbackArgs([
    "--environment",
    "local",
    "--previous-image",
    "paysave-local-previous",
    "--candidate-tag",
    "paysave-local-candidate-test",
    "--dockerfile",
    "docker/Dockerfile.dev",
    "--max-probe-attempts",
    "7",
    "--evidence-path",
    "/tmp/rollback-evidence.json",
  ]);

  assert.equal(config.environment, "local");
  assert.equal(config.previousImage, "paysave-local-previous");
  assert.equal(config.candidateTag, "paysave-local-candidate-test");
  assert.equal(config.dockerfile, "docker/Dockerfile.dev");
  assert.equal(config.maxProbeAttempts, 7);
  assert.equal(config.evidencePath, "/tmp/rollback-evidence.json");
});

test("validateEnvironmentPolicy rejects production", () => {
  assert.throws(() => validateEnvironmentPolicy("production"), {
    message: /production environment is forbidden/i,
  });
});

test("validateEnvironmentPolicy allows non-production environments", () => {
  assert.equal(validateEnvironmentPolicy("local"), true);
  assert.equal(validateEnvironmentPolicy("staging"), true);
});

test("validatePreviousImage accepts only explicit local previous tags", () => {
  assert.equal(validatePreviousImage("paysave-local-previous"), true);
  assert.equal(validatePreviousImage("paysave-local-previous-2026-07-01"), true);
  assert.throws(() => validatePreviousImage("registry.example.com/paysave:stable"), {
    message: /previous image must be local paysave-local-/,
  });
  assert.throws(() => validatePreviousImage("latest"), {
    message: /previous image must be local paysave-local-/,
  });
});

test("buildSyntheticEnvironment contains only synthetic, non-secret defaults", () => {
  const env = buildSyntheticEnvironment({
    candidatePort: 30000,
    syntheticSuffix: "candidate",
    buildTime: false,
  });

  assert.equal(env.NEXT_PUBLIC_APP_URL, "http://127.0.0.1:30000");
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, "https://paysave-local-utility.example");
  assert.equal(env.PAYSAVE_ENABLE_DESIGN_PREVIEW, "false");
  assert.equal(env.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION, "1");
  assert.equal(Buffer.from(env.PAYSAVE_FIELD_ENCRYPTION_KEY, "base64").length, 32);
  assert.equal(env.PAYSAVE_RELEASE_VERSION, "0.1.0-local-drill");
  assert.match(env.PAYSAVE_SOURCE_REVISION, /^[a-f0-9]{40}$/);
  assert.equal(Number.isNaN(Date.parse(env.PAYSAVE_BUILD_TIME)), false);
  assert.match(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, /^pk_test_local_candidate_/);
});

test("redactSecrets redacts obvious secret-like keys", () => {
  const redacted = redactSecrets({
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "top-secret",
    API_TOKEN: "token-value",
    NEXT_PUBLIC_APP_URL: "https://live.example",
    OTHER: "value",
  });

  assert.equal(redacted.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, "[REDACTED]");
  assert.equal(redacted.API_TOKEN, "[REDACTED]");
  assert.equal(redacted.NEXT_PUBLIC_APP_URL, "https://live.example");
  assert.equal(redacted.OTHER, "value");
});

test("buildCandidateDockerArgs uses canonical Dockerfile and candidate tag", () => {
  const args = buildCandidateDockerArgs({
    projectRoot: "/repo",
    dockerfile: "docker/Dockerfile",
    candidateTag: "paysave-local-candidate-abc",
    buildEnv: {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://paysave-local-utility.example",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test_local_build",
    },
  });

  const [command, ...rest] = args;
  assert.equal(command, "docker");
  assert.deepEqual(rest.slice(0, 3), ["build", "--file", "/repo/docker/Dockerfile"]);
  assert.ok(rest.includes("-t"));
  assert.ok(rest.includes("paysave-local-candidate-abc"));
  assert.ok(rest.includes("--build-arg"));
  assert.ok(rest.includes("NEXT_PUBLIC_APP_URL=http://127.0.0.1:3000"));
});

test("buildRunContainerArgs contains random high host port and synthetic env", () => {
  const args = buildRunContainerArgs({
    image: "paysave-local-candidate",
    containerName: "drill-candidate",
    hostPort: 34567,
    environment: {
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:34567",
      NEXT_PUBLIC_SUPABASE_URL: "https://paysave-local-utility.example",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "pk_test_local_candidate",
      PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
    },
  });

  const [command, ...rest] = args;
  assert.equal(command, "docker");
  assert.deepEqual(rest.slice(0, 3), ["run", "--rm", "--detach"]);
  assert.ok(rest.includes("--name"));
  assert.ok(rest.includes("-p"));
  assert.ok(rest.includes("34567:3000"));
  assert.ok(rest.includes("drill-candidate"));
  assert.ok(rest.includes("paysave-local-candidate"));
  assert.equal(rest[rest.length - 1], "paysave-local-candidate");
});

test("chooseRandomHighPort returns high range", () => {
  const port = chooseRandomHighPort(() => 0);
  assert.equal(port >= 20000 && port <= 65000, true);
});

test("waitForHealth returns structured results", async () => {
  const requested = [];
  const result = await waitForHealth({
    baseUrl: "http://127.0.0.1:32123",
    fetcher: async (url, init) => {
      requested.push({ url: String(url), redirect: init?.redirect });
      return {
        status: 200,
        ok: true,
        text: async () => "ok",
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.attempts, 1);
  assert.equal(result.endpoints.length, 3);
  assert.deepEqual(requested, [
    { url: "http://127.0.0.1:32123/healthz", redirect: "manual" },
    { url: "http://127.0.0.1:32123/readyz", redirect: "manual" },
    { url: "http://127.0.0.1:32123/version", redirect: "manual" },
  ]);
});

test("runLocalRollbackRehearsal is blocked when previous image is missing", async () => {
  const callOrder = [];
  const runner = async (command, args) => {
    callOrder.push({ command, args });
    if (command === "docker" && args[0] === "--version") {
      return { stdout: "Docker version 1", exitCode: 0 };
    }
    if (command === "docker" && args[0] === "build") {
      return { stdout: "built", exitCode: 0 };
    }
    if (command === "docker" && args[0] === "run") {
      return { stdout: "container-id", exitCode: 0 };
    }
    if (command === "docker" && args[0] === "stop") {
      return { stdout: "", exitCode: 0 };
    }
    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
  };

  const result = await runLocalRollbackRehearsal(
    {
      environment: "local",
      projectRoot: "/repo",
      candidateTag: "paysave-local-candidate-abc",
      evidencePath: undefined,
      dockerfile: "docker/Dockerfile",
      maxProbeAttempts: 1,
      synthetic: {
        suffix: "candidate",
        hostPort: 30000,
      },
    },
    {
      commandRunner: runner,
      fetcher: async () => ({
        status: 200,
        ok: true,
        text: async () => "{}",
      }),
      randomPort: () => 30000,
      sleep: async () => {},
    },
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "missing-previous-image");
  assert.equal(callOrder.filter((item) => item.args[0] === "stop").length, 1);
});

test("runLocalRollbackRehearsal succeeds with valid previous local image", async () => {
  const calls = [];
  const runner = async (command, args) => {
    calls.push({ command, args });
    if (command === "docker" && args[0] === "--version")
      return { stdout: "Docker version 1", exitCode: 0 };
    if (command === "docker" && args[0] === "build") return { stdout: "built", exitCode: 0 };
    if (command === "docker" && args[0] === "run")
      return { stdout: `${args[args.length - 1]}-id`, exitCode: 0 };
    if (command === "docker" && args[0] === "stop") return { stdout: "", exitCode: 0 };
    throw new Error(`unexpected command: ${command} ${args.join(" ")}`);
  };

  let fetchCount = 0;
  const result = await runLocalRollbackRehearsal(
    {
      environment: "local",
      projectRoot: "/repo",
      candidateTag: "paysave-local-candidate-abc",
      previousImage: "paysave-local-previous-001",
      evidencePath: undefined,
      dockerfile: "docker/Dockerfile",
      maxProbeAttempts: 1,
      synthetic: {
        suffix: "candidate",
        hostPort: 30000,
      },
    },
    {
      commandRunner: runner,
      fetcher: async () => ({
        status: 200,
        ok: true,
        text: async () => "{}",
      }),
      randomPort: () => ++fetchCount + 30000,
      sleep: async () => {},
    },
  );

  assert.equal(result.status, "PASS");
  assert.equal(result.stages.candidate.status, "PASS");
  assert.equal(result.stages.previous.status, "PASS");

  const runCalls = calls.filter((item) => item.args[0] === "run");
  const stopCalls = calls.filter((item) => item.args[0] === "stop");
  assert.equal(runCalls.length, 2);
  assert.equal(stopCalls.length, 2);
  assert.ok(
    calls.some(
      (item) => item.command === "docker" && item.args.includes("paysave-local-previous-001"),
    ),
  );
});

test("buildRollbackEvidence redacts secrets and includes phases", () => {
  const evidence = buildRollbackEvidence({
    evidenceFor: "candidate",
    environment: {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "top-secret",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:1234",
      SAFE: "yes",
    },
  });

  assert.equal(evidence.schema, "paysave-local-rollback-drill/v1");
  assert.equal(
    evidence.candidates[0].environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "[REDACTED]",
  );
  assert.equal(evidence.candidates[0].environment.NEXT_PUBLIC_APP_URL, "[REDACTED]");
  assert.equal(evidence.candidates[0].environment.SAFE, "[REDACTED]");
  assert.equal(evidence.candidates[0].name, "candidate");
});

test("runLocalRollbackRehearsal blocks non-local previous-image tags", async () => {
  const runner = async (command, args) => {
    if (command === "docker" && args[0] === "--version")
      return { stdout: "Docker version 1", exitCode: 0 };
    return { stdout: "", exitCode: 0 };
  };

  const result = await runLocalRollbackRehearsal(
    {
      environment: "local",
      projectRoot: "/repo",
      candidateTag: "paysave-local-candidate-abc",
      previousImage: "registry.example.com/paysave:stable",
      evidencePath: undefined,
      dockerfile: "docker/Dockerfile",
      maxProbeAttempts: 1,
      synthetic: {
        suffix: "candidate",
        hostPort: 30000,
      },
    },
    {
      commandRunner: runner,
      fetcher: async () => ({
        status: 200,
        ok: true,
        text: async () => "{}",
      }),
      randomPort: () => 30000,
      sleep: async () => {},
    },
  );

  assert.equal(result.status, "BLOCKED");
  assert.equal(result.reason, "invalid-previous-image");
});
