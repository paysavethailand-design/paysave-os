import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const execFileAsync = promisify(execFile);
const ROLLBACK_EVIDENCE_SCHEMA = "paysave-local-rollback-drill/v1";

export const HEALTH_ENDPOINTS = ["/healthz", "/readyz", "/version"];
export const DEFAULT_MAX_PROBE_ATTEMPTS = 30;
export const DEFAULT_PROBE_INTERVAL_MS = 1000;
export const DEFAULT_HEALTH_TIMEOUT_MS = 1500;

const SENSITIVE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PAYSAVE_FIELD_ENCRYPTION_KEY",
  "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "SESSION_SECRET",
  "API_TOKEN",
];

function normalizeEvidenceRedaction(value) {
  return String(value).replace(/.{4}/g, "*").slice(0, 4) + "…redacted";
}

export function redactSecrets(input) {
  const result = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    const shouldRedact = SENSITIVE_ENV_KEYS.includes(key) || /KEY|TOKEN|SECRET|PASSWORD/.test(key);
    result[key] = shouldRedact ? "[REDACTED]" : value;
  }
  return result;
}

function redactAllValues(input) {
  const result = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    result[key] = typeof value === "string" ? "[REDACTED]" : value;
  }
  return result;
}

export function buildRollbackEvidence({ evidenceFor, environment, details = {}, phase = {} }) {
  return {
    schema: ROLLBACK_EVIDENCE_SCHEMA,
    name: "rollback-drill",
    candidates: [
      {
        name: evidenceFor,
        environment: redactAllValues(environment ?? {}),
        details,
        phase,
      },
    ],
  };
}

export function chooseRandomHighPort(random = Math.random) {
  return Math.floor(20000 + random() * 45001);
}

export function parseRollbackArgs(argv = process.argv.slice(2)) {
  const config = {
    environment: "local",
    dockerfile: "docker/Dockerfile",
    maxProbeAttempts: DEFAULT_MAX_PROBE_ATTEMPTS,
    maxProbeIntervalMs: DEFAULT_PROBE_INTERVAL_MS,
    healthTimeoutMs: DEFAULT_HEALTH_TIMEOUT_MS,
    projectRoot: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--environment") {
      const value = argv[index + 1];
      if (!value) throw new Error("--environment requires a value");
      config.environment = value;
      index += 1;
      continue;
    }
    if (arg === "--previous-image") {
      const value = argv[index + 1];
      if (!value) throw new Error("--previous-image requires a value");
      config.previousImage = value;
      index += 1;
      continue;
    }
    if (arg === "--candidate-tag") {
      const value = argv[index + 1];
      if (!value) throw new Error("--candidate-tag requires a value");
      config.candidateTag = value;
      index += 1;
      continue;
    }
    if (arg === "--dockerfile") {
      const value = argv[index + 1];
      if (!value) throw new Error("--dockerfile requires a value");
      config.dockerfile = value;
      index += 1;
      continue;
    }
    if (arg === "--evidence-path") {
      const value = argv[index + 1];
      if (!value) throw new Error("--evidence-path requires a value");
      config.evidencePath = value;
      index += 1;
      continue;
    }
    if (arg === "--max-probe-attempts") {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value <= 0)
        throw new Error("--max-probe-attempts must be a positive integer");
      config.maxProbeAttempts = value;
      index += 1;
      continue;
    }
    if (arg === "--max-probe-interval-ms") {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value <= 0)
        throw new Error("--max-probe-interval-ms must be a positive integer");
      config.maxProbeIntervalMs = value;
      index += 1;
      continue;
    }
    if (arg === "--health-timeout-ms") {
      const value = Number.parseInt(argv[index + 1], 10);
      if (Number.isNaN(value) || value <= 0)
        throw new Error("--health-timeout-ms must be a positive integer");
      config.healthTimeoutMs = value;
      index += 1;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      return {
        ...config,
        commandHelpRequested: true,
      };
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  return config;
}

export function validateEnvironmentPolicy(environment) {
  const lowered = String(environment ?? "").toLowerCase();
  if (lowered === "production" || lowered === "prod") {
    throw new Error("production environment is forbidden");
  }

  return true;
}

export function validatePreviousImage(previousImage) {
  if (typeof previousImage !== "string") return false;
  if (!/^paysave-local-.+$/.test(previousImage)) {
    throw new Error("previous image must be local paysave-local-*");
  }

  return true;
}

export function buildSyntheticEnvironment({
  candidatePort = 3000,
  syntheticSuffix = "candidate",
  buildTime = false,
}) {
  return {
    NODE_ENV: "production",
    PAYSAVE_ENVIRONMENT: "local",
    PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "false",
    PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
    PAYSAVE_FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString("base64"),
    PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "1",
    PAYSAVE_RELEASE_VERSION: "0.1.0-local-drill",
    PAYSAVE_SOURCE_REVISION: "d".repeat(40),
    PAYSAVE_BUILD_TIME: new Date().toISOString(),
    NEXT_PUBLIC_APP_URL: buildTime ? "http://127.0.0.1:3000" : `http://127.0.0.1:${candidatePort}`,
    NEXT_PUBLIC_SUPABASE_URL: "https://paysave-local-utility.example",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      `pk_test_local_${syntheticSuffix}_` + randomBytes(8).toString("hex"),
  };
}

export function buildCandidateDockerArgs({ projectRoot, dockerfile, candidateTag, buildEnv }) {
  const absoluteDockerfile = resolve(projectRoot, dockerfile);
  return [
    "docker",
    "build",
    "--file",
    absoluteDockerfile,
    "--build-arg",
    `NEXT_PUBLIC_APP_URL=${buildEnv.NEXT_PUBLIC_APP_URL}`,
    "--build-arg",
    `NEXT_PUBLIC_SUPABASE_URL=${buildEnv.NEXT_PUBLIC_SUPABASE_URL}`,
    "--build-arg",
    `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${buildEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}`,
    "-t",
    candidateTag,
    projectRoot,
  ];
}

export function buildRunContainerArgs({ image, containerName, hostPort, environment }) {
  const envPairs = Object.entries(environment).flatMap(([key, value]) => ["-e", `${key}=${value}`]);
  return [
    "docker",
    "run",
    "--rm",
    "--detach",
    "--name",
    containerName,
    "-p",
    `${hostPort}:3000`,
    ...envPairs,
    image,
  ];
}

export async function runCommand(command, args, { cwd, commandRunner } = {}) {
  if (commandRunner) return commandRunner(command, args, { cwd });

  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      cwd,
      encoding: "utf8",
      shell: false,
    });
    return { stdout: stdout?.trim() || "", stderr: stderr?.trim() || "", exitCode: 0 };
  } catch (error) {
    return {
      stdout: error.stdout?.toString().trim() ?? "",
      stderr: error.stderr?.toString().trim() ?? error.message ?? "command failed",
      exitCode: error.code ?? error.status ?? 1,
    };
  }
}

function sanitizeCommandForEvidence(args) {
  return args.map((token) => {
    if (token.includes("=") && token.length > 20) {
      return token.split("=")[0].concat("=", normalizeEvidenceRedaction(token.split("=")[1] ?? ""));
    }
    return token;
  });
}

async function fetchWithTimeout(fetcher, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetcher(url, { signal: controller.signal, redirect: "manual" });
  } finally {
    clearTimeout(timer);
  }
}

export async function waitForHealth({
  baseUrl,
  endpoints = HEALTH_ENDPOINTS,
  fetcher = globalThis.fetch,
  attempts = DEFAULT_MAX_PROBE_ATTEMPTS,
  intervalMs = DEFAULT_PROBE_INTERVAL_MS,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
}) {
  let lastResult = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const endpointResults = [];
    let allHealthy = true;

    for (const path of endpoints) {
      const url = `${baseUrl}${path}`;
      try {
        const response = await fetchWithTimeout(fetcher, url, timeoutMs);
        const status = response.status;
        endpointResults.push({
          path,
          status,
          ok: status === 200,
        });
        if (status !== 200) allHealthy = false;
      } catch (error) {
        endpointResults.push({
          path,
          status: 0,
          ok: false,
          error: error.name === "AbortError" ? "timeout" : String(error.message ?? error),
        });
        allHealthy = false;
      }
    }

    lastResult = {
      ok: allHealthy,
      attempt,
      attempts: attempt,
      endpoints: endpointResults,
    };

    if (allHealthy) return lastResult;

    if (attempt < attempts && intervalMs > 0) await sleep(intervalMs);
  }

  return lastResult;
}

async function runContainerWithProbe({
  image,
  containerName,
  hostPort,
  environment,
  commandRunner,
  fetcher,
  attempts,
  intervalMs,
  timeoutMs,
}) {
  let containerId = null;
  let stopped = false;
  try {
    const runArgs = buildRunContainerArgs({ image, containerName, hostPort, environment });
    const runResult = await runCommand(runArgs[0], runArgs.slice(1), {
      commandRunner,
    });
    if (runResult.exitCode !== 0) {
      return {
        status: "FAIL",
        container: {
          image,
          containerName,
          hostPort,
          command: sanitizeCommandForEvidence(runArgs),
        },
        probes: null,
        failure: {
          reason: "container-start-failed",
          exitCode: runResult.exitCode,
          stderr: runResult.stderr,
        },
      };
    }

    containerId = runResult.stdout.trim() || containerName;
    const probes = await waitForHealth({
      baseUrl: `http://127.0.0.1:${hostPort}`,
      attempts,
      intervalMs,
      timeoutMs,
      fetcher,
      endpoints: HEALTH_ENDPOINTS,
    });

    return {
      status: probes.ok ? "PASS" : "FAIL",
      container: {
        image,
        containerName,
        hostPort,
        containerId,
        command: sanitizeCommandForEvidence(runArgs),
      },
      probes,
      failure: probes.ok ? null : { reason: "health-check-failed" },
    };
  } finally {
    if (containerId) {
      const stopResult = await runCommand("docker", ["stop", containerName], { commandRunner });
      stopped = stopResult.exitCode === 0;
      if (!stopped) {
        await runCommand("docker", ["rm", "-f", containerName], { commandRunner });
      }
    }
  }
}

function createBaseEvidence(config, candidateTag) {
  return {
    schema: ROLLBACK_EVIDENCE_SCHEMA,
    startedAt: new Date().toISOString(),
    status: "BLOCKED",
    environment: config.environment,
    projectRoot: resolve(config.projectRoot),
    dockerfile: resolve(config.projectRoot, config.dockerfile),
    candidateImage: candidateTag,
    previousImage: config.previousImage ?? null,
    stages: {},
  };
}

export async function runLocalRollbackRehearsal(
  rawConfig,
  { commandRunner, fetcher = globalThis.fetch, randomPort = chooseRandomHighPort } = {},
) {
  const config = {
    environment: "local",
    projectRoot: process.cwd(),
    dockerfile: "docker/Dockerfile",
    maxProbeAttempts: DEFAULT_MAX_PROBE_ATTEMPTS,
    maxProbeIntervalMs: DEFAULT_PROBE_INTERVAL_MS,
    healthTimeoutMs: DEFAULT_HEALTH_TIMEOUT_MS,
    ...rawConfig,
  };

  const evidence = createBaseEvidence(
    config,
    config.candidateTag ?? `paysave-local-candidate-${Date.now()}`,
  );

  try {
    validateEnvironmentPolicy(config.environment);
  } catch (error) {
    evidence.reason = error.message;
    evidence.status = "FAIL";
    return evidence;
  }

  const dockerResult = await runCommand("docker", ["--version"], {
    cwd: config.projectRoot,
    commandRunner,
  });
  if (dockerResult.exitCode !== 0) {
    evidence.reason = "docker-not-available";
    evidence.status = "FAIL";
    evidence.detail = { command: ["docker", "--version"], stderr: dockerResult.stderr };
    return evidence;
  }

  const candidateTag =
    config.candidateTag ??
    `paysave-local-candidate-${Date.now()}-${randomBytes(3).toString("hex")}`;
  evidence.candidateImage = candidateTag;

  const buildEnv = buildSyntheticEnvironment({
    candidatePort: 3000,
    syntheticSuffix: "build",
    buildTime: true,
  });
  const buildArgs = buildCandidateDockerArgs({
    projectRoot: config.projectRoot,
    dockerfile: config.dockerfile,
    candidateTag,
    buildEnv,
  });

  evidence.build = {
    command: sanitizeCommandForEvidence(buildArgs),
    image: candidateTag,
  };

  const buildCommandResult = await runCommand(buildArgs[0], buildArgs.slice(1), {
    cwd: config.projectRoot,
    commandRunner,
  });
  if (buildCommandResult.exitCode !== 0) {
    evidence.status = "FAIL";
    evidence.reason = "candidate-build-failed";
    evidence.build.exitCode = buildCommandResult.exitCode;
    evidence.build.stderr = buildCommandResult.stderr;
    return evidence;
  }

  const candidatePort = config.synthetic?.hostPort ?? randomPort();
  const candidateEnv = buildSyntheticEnvironment({
    candidatePort,
    syntheticSuffix: "candidate",
    buildTime: false,
  });
  const candidateContainerName = `paysave-drill-candidate-${randomBytes(4).toString("hex")}`;

  const candidateResult = await runContainerWithProbe({
    image: candidateTag,
    containerName: candidateContainerName,
    hostPort: candidatePort,
    environment: candidateEnv,
    commandRunner,
    fetcher,
    attempts: config.maxProbeAttempts,
    intervalMs: config.maxProbeIntervalMs,
    timeoutMs: config.healthTimeoutMs,
  });

  evidence.stages.candidate = {
    name: "candidate",
    image: candidateTag,
    port: candidatePort,
    status: candidateResult.status,
    container: {
      name: candidateContainerName,
      command: candidateResult.container.command,
    },
    probes: candidateResult.probes,
    environment: redactAllValues(candidateEnv),
    failure: candidateResult.failure,
  };

  if (candidateResult.status !== "PASS") {
    evidence.status = "FAIL";
    evidence.reason = "candidate-health-check-failed";
    evidence.stages.candidate.probes = candidateResult.probes;
    return evidence;
  }

  if (!config.previousImage) {
    evidence.status = "BLOCKED";
    evidence.reason = "missing-previous-image";
    return evidence;
  }

  try {
    if (!validatePreviousImage(config.previousImage)) {
      evidence.status = "BLOCKED";
      evidence.reason = "invalid-previous-image";
      return evidence;
    }
  } catch (error) {
    evidence.status = "BLOCKED";
    evidence.reason = "invalid-previous-image";
    return evidence;
  }

  const previousPort =
    config.synthetic?.hostPort !== undefined ? config.synthetic.hostPort + 1 : randomPort();
  const previousEnv = buildSyntheticEnvironment({
    candidatePort: previousPort,
    syntheticSuffix: "previous",
    buildTime: false,
  });
  const previousContainerName = `paysave-drill-previous-${randomBytes(4).toString("hex")}`;

  const previousResult = await runContainerWithProbe({
    image: config.previousImage,
    containerName: previousContainerName,
    hostPort: previousPort,
    environment: previousEnv,
    commandRunner,
    fetcher,
    attempts: config.maxProbeAttempts,
    intervalMs: config.maxProbeIntervalMs,
    timeoutMs: config.healthTimeoutMs,
  });

  evidence.stages.previous = {
    name: "previous",
    image: config.previousImage,
    port: previousPort,
    status: previousResult.status,
    container: {
      name: previousContainerName,
      command: previousResult.container.command,
    },
    probes: previousResult.probes,
    environment: redactAllValues(previousEnv),
    failure: previousResult.failure,
  };

  if (previousResult.status !== "PASS") {
    evidence.status = "FAIL";
    evidence.reason = "previous-health-check-failed";
    return evidence;
  }

  evidence.status = "PASS";
  evidence.reason = "rollback-drill-complete";
  evidence.stages.candidate.failure = null;
  evidence.stages.previous.failure = null;

  return evidence;
}

export async function executeRollbackDrillFromCli(argv = process.argv.slice(2)) {
  const config = parseRollbackArgs(argv);
  if (config.commandHelpRequested) {
    const help = `
Usage: rollback-drill.mjs [options]

Options:
  --environment <name>          target environment (default: local)
  --previous-image <tag>        local paysave-local-* image for rollback validation
  --candidate-tag <tag>         explicit local candidate image tag
  --dockerfile <path>           Dockerfile path (default: docker/Dockerfile)
  --evidence-path <path>        write redacted evidence JSON to path
  --max-probe-attempts <n>      health attempts (default: ${DEFAULT_MAX_PROBE_ATTEMPTS})
  --max-probe-interval-ms <n>   delay between attempts (default: ${DEFAULT_PROBE_INTERVAL_MS}ms)
  --health-timeout-ms <n>       per-request timeout (default: ${DEFAULT_HEALTH_TIMEOUT_MS}ms)
  --help
`;
    process.stdout.write(help);
    process.exit(0);
  }

  const evidence = await runLocalRollbackRehearsal(config, {
    commandRunner: async (command, args) => runCommand(command, args, { cwd: config.projectRoot }),
  });
  const serialized = JSON.stringify(evidence, null, 2);

  if (config.evidencePath) {
    await writeFile(config.evidencePath, `${serialized}\n`);
  }

  process.stdout.write(`${serialized}\n`);

  if (evidence.status !== "PASS") {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith("rollback-drill.mjs")) {
  await executeRollbackDrillFromCli(process.argv.slice(2));
}
