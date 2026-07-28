import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateProductionRuntime } from "./validate-production-runtime.mjs";

function completeEnvironment() {
  return {
    PAYSAVE_ENVIRONMENT: "production",
    PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "true",
    NEXT_PUBLIC_APP_URL: "https://app.example.co.th",
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic_value",
    PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
    PAYSAVE_RELEASE_VERSION: "1.0.0",
    PAYSAVE_SOURCE_REVISION: "a".repeat(40),
    PAYSAVE_BUILD_TIME: "2026-07-28T00:00:00Z",
    PAYSAVE_CANONICAL_DOMAIN: "app.example.co.th",
    PAYSAVE_TLS_MIN_VERSION: "1.2",
    PAYSAVE_FIELD_ENCRYPTION_KEY: "A".repeat(43) + "=",
    PAYSAVE_FIELD_ENCRYPTION_KEY_REF: "projects/p/secrets/field-key",
    PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "1",
    PAYSAVE_LINE_CHANNEL_ID: "1234567890",
    PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN: "synthetic-line-token-material-123456",
    PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN_REF: "projects/p/secrets/line-token",
    PAYSAVE_EMAIL_PROVIDER: "resend",
    PAYSAVE_EMAIL_FROM: "noreply@example.co.th",
    PAYSAVE_EMAIL_API_KEY: "synthetic-email-key-material-123456",
    PAYSAVE_EMAIL_API_KEY_REF: "projects/p/secrets/email-key",
    PAYSAVE_GOOGLE_DRIVE_FOLDER_ID: "synthetic-drive-folder-id",
    PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account","project_id":"synthetic"}',
    PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON_REF: "projects/p/secrets/google-service-account",
    PAYSAVE_WEBHOOK_SIGNING_SECRET: "synthetic-webhook-secret-material-123456",
    PAYSAVE_WEBHOOK_SIGNING_SECRET_REF: "projects/p/secrets/webhook-signing",
    PAYSAVE_EXTERNAL_API_ALLOWLIST: "https://api.line.me,https://www.googleapis.com",
    PAYSAVE_MONITORING_DSN: "https://public@example.invalid/1",
    PAYSAVE_MONITORING_DSN_REF: "projects/p/secrets/monitoring-dsn",
  };
}

test("production runtime fails closed without required integrations", () => {
  const failures = evaluateProductionRuntime({ PAYSAVE_ENVIRONMENT: "production" });
  assert.ok(failures.some(({ name }) => name === "PAYSAVE_LINE_CHANNEL_ACCESS_TOKEN_REF"));
  assert.ok(failures.some(({ name }) => name === "PAYSAVE_EMAIL_API_KEY_REF"));
  assert.ok(failures.some(({ name }) => name === "PAYSAVE_GOOGLE_SERVICE_ACCOUNT_JSON_REF"));
  assert.ok(failures.some(({ name }) => name === "PAYSAVE_WEBHOOK_SIGNING_SECRET_REF"));
});

test("production runtime rejects insecure and placeholder deployment identity", () => {
  const environment = completeEnvironment();
  environment.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  environment.PAYSAVE_CANONICAL_DOMAIN = "localhost";
  const failures = evaluateProductionRuntime(environment);
  assert.ok(failures.some(({ name }) => name === "NEXT_PUBLIC_APP_URL"));
  assert.ok(failures.some(({ name }) => name === "PAYSAVE_CANONICAL_DOMAIN"));
});

test("production runtime rejects zero encryption key version", () => {
  const environment = completeEnvironment();
  environment.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION = "0";
  assert.ok(
    evaluateProductionRuntime(environment).some(
      ({ name }) => name === "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
    ),
  );
});

test("production runtime accepts complete synthetic contract without returning values", () => {
  assert.deepEqual(evaluateProductionRuntime(completeEnvironment()), []);
});
