import { describe, expect, it } from "vitest";
import { buildDependencyReadinessPayload, buildReadinessPayload } from "./readiness";

const validEnvironment = {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "https://staging.example.invalid",
  NEXT_PUBLIC_SUPABASE_URL: "https://staging-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staging_placeholder",
  PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
  PAYSAVE_FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "1",
  PAYSAVE_RELEASE_VERSION: "0.1.0-beta.1",
  PAYSAVE_SOURCE_REVISION: "a".repeat(40),
  PAYSAVE_BUILD_TIME: "2026-07-23T00:00:00.000Z",
} as NodeJS.ProcessEnv;

const completeProductionEnvironment = {
  ...validEnvironment,
  NEXT_PUBLIC_APP_URL: "https://app.paysave.co.th",
  PAYSAVE_ENVIRONMENT: "production",
  PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "true",
  PAYSAVE_CANONICAL_DOMAIN: "app.paysave.co.th",
  PAYSAVE_TLS_MIN_VERSION: "1.2",
  PAYSAVE_FIELD_ENCRYPTION_KEY_REF: "projects/paysave-prod/secrets/field-key/versions/1",
  PAYSAVE_LINE_CHANNEL_ID: "1234567890",
  PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN: "runtime-line-token-value",
  PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN_REF: "projects/paysave-prod/secrets/line-token/versions/1",
  PAYSAVE_EMAIL_PROVIDER: "resend",
  PAYSAVE_EMAIL_API_KEY: "runtime-email-key-value",
  PAYSAVE_EMAIL_API_KEY_REF: "projects/paysave-prod/secrets/email-key/versions/1",
  PAYSAVE_EMAIL_FROM: "notify@paysave.co.th",
  PAYSAVE_GOOGLE_DRIVE_FOLDER_ID: "drive-folder-id",
  PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account","project_id":"paysave-prod"}',
  PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON_REF:
    "projects/paysave-prod/secrets/google-service-account/versions/1",
  PAYSAVE_WEBHOOK_SIGNING_SECRET: "runtime-webhook-signing-secret",
  PAYSAVE_WEBHOOK_SIGNING_SECRET_REF: "projects/paysave-prod/secrets/webhook-signing/versions/1",
  PAYSAVE_EXTERNAL_API_ALLOWLIST: "https://partner.example.org",
  PAYSAVE_MONITORING_DSN: "https://monitoring.example.org/project",
  PAYSAVE_MONITORING_DSN_REF: "projects/paysave-prod/secrets/monitoring-dsn/versions/1",
} as NodeJS.ProcessEnv;

describe("GET /readyz", () => {
  it("is ready only when runtime config, encryption, and release identity pass", async () => {
    const route = await import("./route");
    expect(route.dynamic).toBe("force-dynamic");
    expect(buildReadinessPayload(validEnvironment)).toMatchObject({
      status: "ready",
      scope: "config_only",
    });
  });

  it("combines config and managed dependency evidence", () => {
    const payload = buildDependencyReadinessPayload(validEnvironment, [
      { name: "database_dependency", ok: true },
      { name: "auth_dependency", ok: true },
      { name: "storage_dependency", ok: true },
    ]);
    expect(payload).toMatchObject({ status: "ready", scope: "dependency_aware" });
    expect(payload.checks).toHaveLength(7);
  });

  it("fails closed in production when operational integration contract is incomplete", () => {
    const payload = buildReadinessPayload({
      ...validEnvironment,
      PAYSAVE_ENVIRONMENT: "production",
      PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "true",
    });
    expect(payload.status).toBe("not_ready");
    expect(payload.checks).toContainEqual({
      name: "production_runtime_contract",
      ok: false,
      detail: "production_runtime_contract_invalid_or_missing",
    });
  });

  it("accepts a complete production operational integration contract", () => {
    const payload = buildReadinessPayload(completeProductionEnvironment);
    expect(payload.checks).toContainEqual({ name: "production_runtime_contract", ok: true });
  });

  it("fails closed when production application and Supabase hosts are identical", () => {
    const payload = buildReadinessPayload({
      ...completeProductionEnvironment,
      NEXT_PUBLIC_SUPABASE_URL: completeProductionEnvironment.NEXT_PUBLIC_APP_URL,
    });
    expect(payload.status).toBe("not_ready");
    expect(payload.checks).toContainEqual({
      name: "production_runtime_contract",
      ok: false,
      detail: "production_runtime_contract_invalid_or_missing",
    });
  });

  it("matches canonical CLI trimming for production environment values", () => {
    const paddedEnvironment = Object.fromEntries(
      Object.entries(completeProductionEnvironment).map(([name, value]) => [
        name,
        typeof value === "string" ? ` ${value} ` : value,
      ]),
    ) as NodeJS.ProcessEnv;
    const payload = buildReadinessPayload(paddedEnvironment);
    expect(payload.status).toBe("ready");
    expect(payload.checks).toContainEqual({ name: "production_runtime_contract", ok: true });
  });

  it("fails closed when field encryption config is absent", () => {
    const env = { ...validEnvironment };
    delete env.PAYSAVE_FIELD_ENCRYPTION_KEY;
    const payload = buildReadinessPayload(env);
    expect(payload.status).toBe("not_ready");
    expect(payload.checks).toContainEqual({
      name: "field_encryption",
      ok: false,
      detail: "field_encryption_invalid_or_missing",
    });
  });
});
