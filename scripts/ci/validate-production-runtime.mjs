import { fileURLToPath } from "node:url";

const SECRET_REFERENCE_PATTERNS = [
  /^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:[A-Za-z0-9\/_-]+$/,
  /^projects\/[a-zA-Z0-9-]+\/secrets\/[A-Za-z0-9_/-]+$/,
  /^sm:\/\/[A-Za-z0-9-]+\/.+$/,
  /^vault:\/\/.+$/,
  /^secret:\/\/.+$/,
];

function value(env, name) {
  return typeof env?.[name] === "string" ? env[name].trim() : "";
}
function required(failures, env, name, reason = "is required for production runtime") {
  if (!value(env, name)) failures.push({ name, reason });
}
function validHttps(raw) {
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}
function validSecretRef(raw) {
  return SECRET_REFERENCE_PATTERNS.some((pattern) => pattern.test(raw));
}

export function evaluateProductionRuntime(env) {
  const failures = [];
  const requiredNames = [
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "PAYSAVE_FIELD_ENCRYPTION_KEY",
    "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
    "PAYSAVE_LINE_CHANNEL_ID",
    "PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN",
    "PAYSAVE_EMAIL_PROVIDER",
    "PAYSAVE_EMAIL_FROM",
    "PAYSAVE_EMAIL_API_KEY",
    "PAYSAVE_GOOGLE_DRIVE_FOLDER_ID",
    "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON",
    "PAYSAVE_WEBHOOK_SIGNING_SECRET",
    "PAYSAVE_EXTERNAL_API_ALLOWLIST",
    "PAYSAVE_MONITORING_DSN",
  ];
  for (const name of requiredNames) required(failures, env, name);

  if (value(env, "PAYSAVE_ENVIRONMENT") !== "production")
    failures.push({ name: "PAYSAVE_ENVIRONMENT", reason: 'must be exactly "production"' });
  if (value(env, "PAYSAVE_PRODUCTION_ACCESS_ALLOWED") !== "true")
    failures.push({ name: "PAYSAVE_PRODUCTION_ACCESS_ALLOWED", reason: "must be exactly true" });
  if (value(env, "PAYSAVE_ENABLE_DESIGN_PREVIEW") !== "false")
    failures.push({ name: "PAYSAVE_ENABLE_DESIGN_PREVIEW", reason: "must be exactly false" });

  for (const name of [
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "PAYSAVE_MONITORING_DSN",
  ]) {
    if (!validHttps(value(env, name)))
      failures.push({ name, reason: "must be a non-local HTTPS URL" });
  }
  try {
    if (
      new URL(value(env, "NEXT_PUBLIC_APP_URL")).hostname ===
      new URL(value(env, "NEXT_PUBLIC_SUPABASE_URL")).hostname
    )
      failures.push({
        name: "NEXT_PUBLIC_SUPABASE_URL",
        reason: "host must be distinct from application host",
      });
  } catch {
    // URL failures are already recorded.
  }

  const domain = value(env, "PAYSAVE_CANONICAL_DOMAIN").toLowerCase();
  if (!domain || domain === "localhost" || domain.endsWith(".invalid") || !domain.includes("."))
    failures.push({
      name: "PAYSAVE_CANONICAL_DOMAIN",
      reason: "must be an approved public domain",
    });
  try {
    if (domain && new URL(value(env, "NEXT_PUBLIC_APP_URL")).hostname !== domain)
      failures.push({
        name: "PAYSAVE_CANONICAL_DOMAIN",
        reason: "must match NEXT_PUBLIC_APP_URL hostname",
      });
  } catch {
    // URL failure is already recorded.
  }
  if (!new Set(["1.2", "1.3"]).has(value(env, "PAYSAVE_TLS_MIN_VERSION")))
    failures.push({ name: "PAYSAVE_TLS_MIN_VERSION", reason: "must be 1.2 or 1.3" });

  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value(env, "PAYSAVE_RELEASE_VERSION")))
    failures.push({ name: "PAYSAVE_RELEASE_VERSION", reason: "must be SemVer" });
  if (!/^[a-f0-9]{40}$/i.test(value(env, "PAYSAVE_SOURCE_REVISION")))
    failures.push({ name: "PAYSAVE_SOURCE_REVISION", reason: "must be a 40-character revision" });
  if (Number.isNaN(Date.parse(value(env, "PAYSAVE_BUILD_TIME"))))
    failures.push({ name: "PAYSAVE_BUILD_TIME", reason: "must be an ISO timestamp" });

  const key = value(env, "PAYSAVE_FIELD_ENCRYPTION_KEY");
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, "base64").length !== 32)
    failures.push({ name: "PAYSAVE_FIELD_ENCRYPTION_KEY", reason: "must be a 32-byte base64 key" });
  if (!/^[1-9]\d*$/.test(value(env, "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION")))
    failures.push({
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      reason: "must be a positive integer",
    });

  for (const name of [
    "PAYSAVE_FIELD_ENCRYPTION_KEY_REF",
    "PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN_REF",
    "PAYSAVE_EMAIL_API_KEY_REF",
    "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON_REF",
    "PAYSAVE_WEBHOOK_SIGNING_SECRET_REF",
    "PAYSAVE_MONITORING_DSN_REF",
  ]) {
    if (!validSecretRef(value(env, name)))
      failures.push({ name, reason: "must be an approved Secret Manager reference" });
  }

  const email = value(env, "PAYSAVE_EMAIL_FROM");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    failures.push({ name: "PAYSAVE_EMAIL_FROM", reason: "must be a valid sender address" });
  try {
    const credential = JSON.parse(value(env, "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON"));
    if (credential?.type !== "service_account" || !credential?.project_id) throw new Error();
  } catch {
    failures.push({
      name: "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON",
      reason: "must be valid service-account JSON",
    });
  }
  const allowlist = value(env, "PAYSAVE_EXTERNAL_API_ALLOWLIST")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (allowlist.length === 0 || allowlist.some((item) => !validHttps(item)))
    failures.push({
      name: "PAYSAVE_EXTERNAL_API_ALLOWLIST",
      reason: "must contain only non-local HTTPS origins",
    });

  // DATABASE_URL (optional by design — used only for transactional recovery profiles)
  // Format-validated only when present.
  const dbUrl = value(env, "DATABASE_URL");
  if (dbUrl) {
    const isPg = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");
    if (!isPg && !validSecretRef(dbUrl)) {
      failures.push({
        name: "DATABASE_URL",
        reason: "when present must be a postgresql:// connection string or approved Secret Manager reference",
      });
    }
  }

  return failures;
}

async function main() {
  const failures = evaluateProductionRuntime(process.env);
  if (failures.length === 0) {
    console.log("PRODUCTION_RUNTIME_CHECK_PASS");
    return;
  }
  console.log("PRODUCTION_RUNTIME_CHECK_FAIL");
  for (const { name, reason } of failures) console.log(`${name}: ${reason}`);
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
