import { parsePublicEnvironment, parseServerEnvironment } from "@/shared/config/env";
import { parseFieldEncryptionEnvironment } from "@/shared/config/field-encryption-env";

export interface ReadinessCheck {
  readonly name: string;
  readonly ok: boolean;
  readonly detail?: string;
}

export interface ReadyzPayload {
  readonly status: "ready" | "not_ready";
  readonly scope: "config_only" | "dependency_aware";
  readonly checks: readonly ReadinessCheck[];
}

function environmentValue(environment: NodeJS.ProcessEnv, name: string): string {
  const current = environment[name];
  return typeof current === "string" ? current.trim() : "";
}

function checkPublicEnvironment(environment: NodeJS.ProcessEnv): ReadinessCheck {
  try {
    parsePublicEnvironment({
      NEXT_PUBLIC_APP_URL: environmentValue(environment, "NEXT_PUBLIC_APP_URL"),
      NEXT_PUBLIC_SUPABASE_URL: environmentValue(environment, "NEXT_PUBLIC_SUPABASE_URL"),
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: environmentValue(
        environment,
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      ),
    });
    return { name: "public_environment", ok: true };
  } catch {
    return {
      name: "public_environment",
      ok: false,
      detail: "public_environment_invalid_or_missing",
    };
  }
}

function checkServerEnvironment(environment: NodeJS.ProcessEnv): ReadinessCheck {
  try {
    parseServerEnvironment({
      PAYSAVE_ENABLE_DESIGN_PREVIEW: environmentValue(environment, "PAYSAVE_ENABLE_DESIGN_PREVIEW"),
    });
    if (environmentValue(environment, "PAYSAVE_ENABLE_DESIGN_PREVIEW") !== "false") {
      throw new Error("preview must be disabled");
    }
    return { name: "server_environment", ok: true };
  } catch {
    return {
      name: "server_environment",
      ok: false,
      detail: "server_environment_invalid_or_missing",
    };
  }
}

function checkFieldEncryption(environment: NodeJS.ProcessEnv): ReadinessCheck {
  try {
    parseFieldEncryptionEnvironment({
      PAYSAVE_FIELD_ENCRYPTION_KEY: environmentValue(environment, "PAYSAVE_FIELD_ENCRYPTION_KEY"),
      PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: environmentValue(
        environment,
        "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      ),
    });
    return { name: "field_encryption", ok: true };
  } catch {
    return {
      name: "field_encryption",
      ok: false,
      detail: "field_encryption_invalid_or_missing",
    };
  }
}

function checkReleaseIdentity(environment: NodeJS.ProcessEnv): ReadinessCheck {
  const releaseEnvironment: NodeJS.ProcessEnv = {
    ...environment,
    PAYSAVE_RELEASE_VERSION:
      environment.PAYSAVE_RELEASE_VERSION ?? process.env.PAYSAVE_RELEASE_VERSION,
    PAYSAVE_SOURCE_REVISION:
      environment.PAYSAVE_SOURCE_REVISION ?? process.env.PAYSAVE_SOURCE_REVISION,
    PAYSAVE_BUILD_TIME: environment.PAYSAVE_BUILD_TIME ?? process.env.PAYSAVE_BUILD_TIME,
  };
  const version = environmentValue(releaseEnvironment, "PAYSAVE_RELEASE_VERSION");
  const revision = environmentValue(releaseEnvironment, "PAYSAVE_SOURCE_REVISION");
  const buildTime = environmentValue(releaseEnvironment, "PAYSAVE_BUILD_TIME");
  const valid = Boolean(
    version &&
    /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) &&
    revision &&
    /^[a-f0-9]{40}$/i.test(revision) &&
    buildTime &&
    !Number.isNaN(Date.parse(buildTime)),
  );
  return valid
    ? { name: "release_identity", ok: true }
    : {
        name: "release_identity",
        ok: false,
        detail: "release_identity_invalid_or_missing",
      };
}

const secretReferencePatterns = [
  /^arn:aws:secretsmanager:[a-z0-9-]+:\d{12}:secret:[A-Za-z0-9\/_-]+$/,
  /^projects\/[A-Za-z0-9-]+\/secrets\/[A-Za-z0-9_/-]+$/,
  /^sm:\/\/[A-Za-z0-9-]+\/.+$/,
  /^vault:\/\/.+$/,
  /^secret:\/\/.+$/,
];

function isHttpsUrl(value: string | undefined): boolean {
  try {
    if (!value) return false;
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isSecretReference(value: string | undefined): boolean {
  return Boolean(value && secretReferencePatterns.some((pattern) => pattern.test(value)));
}

function checkProductionRuntimeContract(
  environment: NodeJS.ProcessEnv,
): ReadinessCheck | undefined {
  if (environmentValue(environment, "PAYSAVE_ENVIRONMENT") !== "production") return undefined;

  const canonicalDomain = environmentValue(environment, "PAYSAVE_CANONICAL_DOMAIN").toLowerCase();
  let appHost = "";
  let supabaseHost = "";
  try {
    appHost = new URL(environmentValue(environment, "NEXT_PUBLIC_APP_URL")).hostname;
    supabaseHost = new URL(environmentValue(environment, "NEXT_PUBLIC_SUPABASE_URL")).hostname;
  } catch {
    appHost = "";
    supabaseHost = "";
  }

  let serviceAccountValid = false;
  try {
    const serviceAccount = JSON.parse(
      environmentValue(environment, "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON"),
    ) as {
      readonly type?: unknown;
      readonly project_id?: unknown;
    };
    serviceAccountValid =
      serviceAccount.type === "service_account" && Boolean(serviceAccount.project_id);
  } catch {
    serviceAccountValid = false;
  }

  const externalAllowlist = environmentValue(environment, "PAYSAVE_EXTERNAL_API_ALLOWLIST")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const valid = Boolean(
    environmentValue(environment, "PAYSAVE_PRODUCTION_ACCESS_ALLOWED") === "true" &&
    isHttpsUrl(environmentValue(environment, "NEXT_PUBLIC_APP_URL")) &&
    isHttpsUrl(environmentValue(environment, "NEXT_PUBLIC_SUPABASE_URL")) &&
    appHost !== supabaseHost &&
    canonicalDomain &&
    canonicalDomain.includes(".") &&
    !canonicalDomain.endsWith(".invalid") &&
    appHost === canonicalDomain &&
    new Set(["1.2", "1.3"]).has(environmentValue(environment, "PAYSAVE_TLS_MIN_VERSION")) &&
    isSecretReference(environmentValue(environment, "PAYSAVE_FIELD_ENCRYPTION_KEY_REF")) &&
    environmentValue(environment, "PAYSAVE_LINE_CHANNEL_ID") &&
    environmentValue(environment, "PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN") &&
    isSecretReference(environmentValue(environment, "PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN_REF")) &&
    environmentValue(environment, "PAYSAVE_EMAIL_PROVIDER") &&
    environmentValue(environment, "PAYSAVE_EMAIL_API_KEY") &&
    isSecretReference(environmentValue(environment, "PAYSAVE_EMAIL_API_KEY_REF")) &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(environmentValue(environment, "PAYSAVE_EMAIL_FROM")) &&
    environmentValue(environment, "PAYSAVE_GOOGLE_DRIVE_FOLDER_ID") &&
    serviceAccountValid &&
    isSecretReference(environmentValue(environment, "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON_REF")) &&
    environmentValue(environment, "PAYSAVE_WEBHOOK_SIGNING_SECRET") &&
    isSecretReference(environmentValue(environment, "PAYSAVE_WEBHOOK_SIGNING_SECRET_REF")) &&
    externalAllowlist.length > 0 &&
    externalAllowlist.every(isHttpsUrl) &&
    isHttpsUrl(environmentValue(environment, "PAYSAVE_MONITORING_DSN")) &&
    isSecretReference(environmentValue(environment, "PAYSAVE_MONITORING_DSN_REF")),
  );

  return valid
    ? { name: "production_runtime_contract", ok: true }
    : {
        name: "production_runtime_contract",
        ok: false,
        detail: "production_runtime_contract_invalid_or_missing",
      };
}

export function buildReadinessPayload(environment: NodeJS.ProcessEnv = process.env): ReadyzPayload {
  const baseChecks: ReadinessCheck[] = [
    checkPublicEnvironment(environment),
    checkServerEnvironment(environment),
    checkFieldEncryption(environment),
    checkReleaseIdentity(environment),
  ];
  const productionRuntime = checkProductionRuntimeContract(environment);
  if (productionRuntime) baseChecks.push(productionRuntime);
  const checks = Object.freeze(baseChecks);
  return {
    status: checks.every((check) => check.ok) ? "ready" : "not_ready",
    scope: "config_only",
    checks,
  };
}

export function buildDependencyReadinessPayload(
  environment: NodeJS.ProcessEnv,
  dependencyChecks: readonly ReadinessCheck[],
): ReadyzPayload {
  const config = buildReadinessPayload(environment);
  const checks = Object.freeze([...config.checks, ...dependencyChecks]);
  return {
    status: checks.every((check) => check.ok) ? "ready" : "not_ready",
    scope: "dependency_aware",
    checks,
  };
}
