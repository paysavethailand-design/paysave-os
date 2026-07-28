import { fileURLToPath } from "node:url";

const DEFAULT_FORBIDDEN_PRODUCTION_HOSTS = new Set([
  "paysave.app",
  "paysave-staging.app",
  "staging.paysave.app",
  "supabase.paysave.com",
]);

const DEFAULT_SECRET_REFERENCE_PATTERNS = [
  /^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:[A-Za-z0-9\/_-]+$/,
  /^projects\/[a-zA-Z0-9-]+\/secrets\/[A-Za-z0-9_/-]+$/,
  /^sm:\/\/[A-Za-z0-9-]+\/.+$/,
  /^vault:\/\/.+$/,
  /^secret:\/\/.+$/,
];

function normalizeHost(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function parseSecretReferencePatterns(rawPatterns) {
  if (!Array.isArray(rawPatterns) || rawPatterns.length === 0) {
    return [...DEFAULT_SECRET_REFERENCE_PATTERNS];
  }

  const compiled = [];
  for (const raw of rawPatterns) {
    if (raw instanceof RegExp) {
      compiled.push(raw);
      continue;
    }
    try {
      compiled.push(new RegExp(raw));
    } catch {
      throw new Error(`invalid secret-reference pattern: ${raw}`);
    }
  }
  return compiled;
}

function parseForbiddenHosts(configuredHosts) {
  const normalized = new Set(DEFAULT_FORBIDDEN_PRODUCTION_HOSTS);
  for (const rawHost of configuredHosts || []) {
    if (typeof rawHost !== "string") continue;
    const host = normalizeHost(rawHost);
    if (host.length > 0) normalized.add(host);
  }
  return normalized;
}

function isForbiddenHost(host, forbiddenHosts) {
  const normalizedHost = normalizeHost(host);
  for (const forbidden of forbiddenHosts) {
    const normalizedForbidden = normalizeHost(forbidden);
    if (
      normalizedHost === normalizedForbidden ||
      normalizedHost.endsWith(`.${normalizedForbidden}`)
    ) {
      return true;
    }
  }
  return false;
}

function getEnvValue(env, key) {
  const value = env?.[key];
  if (typeof value !== "string") return undefined;
  return value;
}

function isMissing(value) {
  return typeof value !== "string" || value.trim().length === 0;
}

function validateUrlVariable(failures, name, value, forbiddenHosts) {
  if (isMissing(value)) {
    failures.push({ name, reason: "is required for staging runtime" });
    return;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    failures.push({ name, reason: "must be a valid URL" });
    return;
  }

  if (parsed.protocol !== "https:") {
    failures.push({ name, reason: "must be an HTTPS URL" });
  }

  if (forbiddenHosts.size > 0 && isForbiddenHost(parsed.hostname, forbiddenHosts)) {
    failures.push({
      name,
      reason: `host must not be one of: ${Array.from(forbiddenHosts).join(", ")}`,
    });
  }
}

function validateSecretReference(value, patterns) {
  if (isMissing(value)) return false;
  if (!patterns.some((pattern) => pattern.test(value))) return false;
  return true;
}

function isValidFieldEncryptionKey(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9+/]{43}=$/.test(value)) return false;
  try {
    return Buffer.from(value, "base64").length === 32;
  } catch {
    return false;
  }
}

export function evaluateStagingRuntime(env, options = {}) {
  const forbiddenHosts = parseForbiddenHosts(options.forbiddenProductionHosts || []);
  const secretReferencePatterns = parseSecretReferencePatterns(options.secretReferencePatterns);

  const failures = [];

  const envValue = {
    PAYSAVE_ENVIRONMENT: getEnvValue(env, "PAYSAVE_ENVIRONMENT"),
    PAYSAVE_PRODUCTION_ACCESS_ALLOWED: getEnvValue(env, "PAYSAVE_PRODUCTION_ACCESS_ALLOWED"),
    NEXT_PUBLIC_APP_URL: getEnvValue(env, "NEXT_PUBLIC_APP_URL"),
    NEXT_PUBLIC_SUPABASE_URL: getEnvValue(env, "NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: getEnvValue(env, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    PAYSAVE_FIELD_ENCRYPTION_KEY: getEnvValue(env, "PAYSAVE_FIELD_ENCRYPTION_KEY"),
    PAYSAVE_FIELD_ENCRYPTION_KEY_REF: getEnvValue(env, "PAYSAVE_FIELD_ENCRYPTION_KEY_REF"),
    PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: getEnvValue(env, "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION"),
    PAYSAVE_ENABLE_DESIGN_PREVIEW: getEnvValue(env, "PAYSAVE_ENABLE_DESIGN_PREVIEW"),
  };

  if (envValue.PAYSAVE_ENVIRONMENT !== "staging") {
    failures.push({
      name: "PAYSAVE_ENVIRONMENT",
      reason:
        envValue.PAYSAVE_ENVIRONMENT === undefined
          ? "is required for staging runtime"
          : 'must be exactly "staging"',
    });
  }

  if (envValue.PAYSAVE_PRODUCTION_ACCESS_ALLOWED !== "false") {
    failures.push({
      name: "PAYSAVE_PRODUCTION_ACCESS_ALLOWED",
      reason:
        isMissing(envValue.PAYSAVE_PRODUCTION_ACCESS_ALLOWED) ||
        envValue.PAYSAVE_PRODUCTION_ACCESS_ALLOWED === undefined
          ? "is required for staging runtime"
          : "must be exactly false",
    });
  }

  if (envValue.NEXT_PUBLIC_APP_URL === undefined) {
    failures.push({ name: "NEXT_PUBLIC_APP_URL", reason: "is required for staging runtime" });
  } else {
    validateUrlVariable(
      failures,
      "NEXT_PUBLIC_APP_URL",
      envValue.NEXT_PUBLIC_APP_URL,
      forbiddenHosts,
    );
  }

  if (envValue.NEXT_PUBLIC_SUPABASE_URL === undefined) {
    failures.push({ name: "NEXT_PUBLIC_SUPABASE_URL", reason: "is required for staging runtime" });
  } else {
    validateUrlVariable(
      failures,
      "NEXT_PUBLIC_SUPABASE_URL",
      envValue.NEXT_PUBLIC_SUPABASE_URL,
      forbiddenHosts,
    );
  }

  try {
    if (
      envValue.NEXT_PUBLIC_APP_URL &&
      envValue.NEXT_PUBLIC_SUPABASE_URL &&
      new URL(envValue.NEXT_PUBLIC_APP_URL).hostname ===
        new URL(envValue.NEXT_PUBLIC_SUPABASE_URL).hostname
    ) {
      failures.push({
        name: "NEXT_PUBLIC_SUPABASE_URL",
        reason: "host must be distinct from NEXT_PUBLIC_APP_URL",
      });
    }
  } catch {
    // URL validation above already records malformed values.
  }

  if (isMissing(envValue.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    failures.push({
      name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      reason: "is required for staging runtime",
    });
  }

  if (isMissing(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY)) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY",
      reason: "is required for staging runtime",
    });
  } else if (!isValidFieldEncryptionKey(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY)) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY",
      reason: "must be a 32-byte base64 runtime key",
    });
  }

  if (isMissing(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY_REF)) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_REF",
      reason: "is required for staging runtime",
    });
  } else if (
    !validateSecretReference(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY_REF, secretReferencePatterns)
  ) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_REF",
      reason: "must be a secret reference identifier, not raw key material",
    });
  }

  if (isMissing(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION)) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      reason: "is required for staging runtime",
    });
  } else if (!/^\d+$/.test(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION.trim())) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      reason: "must be a positive integer",
    });
  } else if (Number.parseInt(envValue.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION, 10) < 1) {
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      reason: "must be a positive integer",
    });
  }

  if (envValue.PAYSAVE_ENABLE_DESIGN_PREVIEW !== "false") {
    failures.push({
      name: "PAYSAVE_ENABLE_DESIGN_PREVIEW",
      reason:
        isMissing(envValue.PAYSAVE_ENABLE_DESIGN_PREVIEW) ||
        envValue.PAYSAVE_ENABLE_DESIGN_PREVIEW === undefined
          ? "is required for staging runtime"
          : "must be exactly false",
    });
  }

  return failures;
}

function parseCommaSeparatedList(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseArgList(argv, key) {
  const values = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === `--${key}` && index + 1 < argv.length) {
      const inlineValue = argv[index + 1];
      if (inlineValue && inlineValue.length > 0 && !inlineValue.startsWith("--")) {
        values.push(...parseCommaSeparatedList(inlineValue));
        continue;
      }
    }

    if (arg.startsWith(`--${key}=`)) {
      const inlineValue = arg.slice(`--${key}=`.length);
      if (inlineValue.length > 0) {
        values.push(...parseCommaSeparatedList(inlineValue));
      }
    }
  }

  return values;
}

async function main() {
  const args = process.argv.slice(2);
  const forbiddenHosts = parseArgList(args, "forbidden-production-hosts");
  const configuredHostCsv = parseCommaSeparatedList(process.env.PAYSAVE_FORBIDDEN_PRODUCTION_HOSTS);
  const hostList = [...configuredHostCsv, ...forbiddenHosts];

  const failures = evaluateStagingRuntime(process.env, {
    forbiddenProductionHosts: hostList,
  });

  if (failures.length === 0) {
    console.log("STAGING_RUNTIME_CHECK_PASS");
    return;
  }

  console.log("STAGING_RUNTIME_CHECK_FAIL");
  for (const { name, reason } of failures) {
    console.log(`${name}: ${reason}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
