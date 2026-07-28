import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateStagingRuntime } from "./validate-staging-runtime.mjs";

function assertFailureRows(failures, expected) {
  assert.deepEqual(failures, expected);
}

const REQUIRED_VALID_ENV = {
  PAYSAVE_ENVIRONMENT: "staging",
  PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "false",
  NEXT_PUBLIC_APP_URL: "https://staging.app.paysave.io",
  NEXT_PUBLIC_SUPABASE_URL: "https://staging.supabase.paysave.io",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staging",
  PAYSAVE_FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  PAYSAVE_FIELD_ENCRYPTION_KEY_REF:
    "arn:aws:secretsmanager:us-east-1:123456789012:secret:paysave/staging/field-encryption-key",
  PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "5",
  PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
};

test("passes clean staging runtime environment with reference-based secrets", () => {
  const failures = evaluateStagingRuntime(REQUIRED_VALID_ENV, {
    forbiddenProductionHosts: ["prod.paysave.app", "prod-supabase.paysave.io"],
  });

  assert.deepEqual(failures, []);
});

test("requires exact staging environment and disables production access", () => {
  assertFailureRows(
    evaluateStagingRuntime(
      {
        ...REQUIRED_VALID_ENV,
        PAYSAVE_ENVIRONMENT: "production",
        PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "true",
      },
      {
        forbiddenProductionHosts: ["prod.paysave.app", "prod-supabase.paysave.io"],
      },
    ),
    [
      {
        name: "PAYSAVE_ENVIRONMENT",
        reason: 'must be exactly "staging"',
      },
      {
        name: "PAYSAVE_PRODUCTION_ACCESS_ALLOWED",
        reason: "must be exactly false",
      },
    ],
  );
});

test("requires design preview false and required field-encryption variables", () => {
  const env = {
    ...REQUIRED_VALID_ENV,
  };
  delete env.PAYSAVE_ENABLE_DESIGN_PREVIEW;
  delete env.PAYSAVE_FIELD_ENCRYPTION_KEY;
  delete env.PAYSAVE_FIELD_ENCRYPTION_KEY_REF;
  delete env.PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION;

  assertFailureRows(evaluateStagingRuntime(env), [
    {
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY",
      reason: "is required for staging runtime",
    },
    {
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_REF",
      reason: "is required for staging runtime",
    },
    {
      name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
      reason: "is required for staging runtime",
    },
    {
      name: "PAYSAVE_ENABLE_DESIGN_PREVIEW",
      reason: "is required for staging runtime",
    },
  ]);
});

test("enforces HTTPS and blocks forbidden production hosts for App and Supabase URLs", () => {
  const failures = evaluateStagingRuntime(
    {
      ...REQUIRED_VALID_ENV,
      NEXT_PUBLIC_APP_URL: "http://staging.app.paysave.io",
      NEXT_PUBLIC_SUPABASE_URL: "https://prod-supabase.paysave.io",
    },
    {
      forbiddenProductionHosts: ["prod-supabase.paysave.io"],
    },
  );

  assert.equal(failures[0].name, "NEXT_PUBLIC_APP_URL");
  assert.equal(failures[0].reason, "must be an HTTPS URL");
  assert.equal(failures[1].name, "NEXT_PUBLIC_SUPABASE_URL");
  assert.equal(
    failures[1].reason,
    "host must not be one of: paysave.app, paysave-staging.app, staging.paysave.app, supabase.paysave.com, prod-supabase.paysave.io",
  );
});

test("rejects raw secret material as a secret-manager reference", () => {
  const rawBase64 = Buffer.alloc(32, 7).toString("base64");
  const failures = evaluateStagingRuntime({
    ...REQUIRED_VALID_ENV,
    PAYSAVE_FIELD_ENCRYPTION_KEY_REF: rawBase64,
  });

  assertFailureRows(
    failures.filter(({ name }) => name === "PAYSAVE_FIELD_ENCRYPTION_KEY_REF"),
    [
      {
        name: "PAYSAVE_FIELD_ENCRYPTION_KEY_REF",
        reason: "must be a secret reference identifier, not raw key material",
      },
    ],
  );
});

test("accepts a valid GCP Secret Manager reference", () => {
  const failures = evaluateStagingRuntime({
    ...REQUIRED_VALID_ENV,
    PAYSAVE_FIELD_ENCRYPTION_KEY_REF: "projects/paysave-staging/secrets/field-encryption-key",
  });

  assert.deepEqual(failures, []);
});

test("requires application and Supabase hosts to be distinct", () => {
  const failures = evaluateStagingRuntime({
    ...REQUIRED_VALID_ENV,
    NEXT_PUBLIC_APP_URL: "https://shared.staging.example",
    NEXT_PUBLIC_SUPABASE_URL: "https://shared.staging.example",
  });
  assert.deepEqual(failures, [
    {
      name: "NEXT_PUBLIC_SUPABASE_URL",
      reason: "host must be distinct from NEXT_PUBLIC_APP_URL",
    },
  ]);
});

test("rejects field encryption version that is not a positive integer", () => {
  const failures = evaluateStagingRuntime({
    ...REQUIRED_VALID_ENV,
    PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "abc",
  });

  assertFailureRows(
    failures.filter(({ name }) => name === "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION"),
    [
      {
        name: "PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION",
        reason: "must be a positive integer",
      },
    ],
  );
});

test("CLI emits only names and reasons and never values", () => {
  const nodePath = process.execPath;
  const scriptPath = fileURLToPath(new URL("./validate-staging-runtime.mjs", import.meta.url));
  const rawSecret = "very-likely-raw-key-that-should-not-appear";

  const child = spawnSync(
    nodePath,
    [scriptPath, "--forbidden-production-hosts=prod.paysave.app,prod-supabase.paysave.io"],
    {
      env: {
        ...process.env,
        PAYSAVE_ENVIRONMENT: "staging",
        PAYSAVE_PRODUCTION_ACCESS_ALLOWED: "false",
        NEXT_PUBLIC_APP_URL: "https://staging.app.paysave.io",
        NEXT_PUBLIC_SUPABASE_URL: "https://prod-supabase.paysave.io",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_staging",
        PAYSAVE_FIELD_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
        PAYSAVE_FIELD_ENCRYPTION_KEY_REF: rawSecret,
        PAYSAVE_FIELD_ENCRYPTION_KEY_VERSION: "3",
        PAYSAVE_ENABLE_DESIGN_PREVIEW: "false",
      },
      cwd: "/tmp",
      encoding: "utf8",
    },
  );

  const output = `${child.stdout}${child.stderr}`;
  assert.equal(child.status, 1);
  assert.equal(output.includes(rawSecret), false);
  assert.equal(output.includes("PAYSAVE_FIELD_ENCRYPTION_KEY_REF"), true);
  assert.equal(
    output.includes(
      "PAYSAVE_FIELD_ENCRYPTION_KEY_REF: must be a secret reference identifier, not raw key material",
    ),
    true,
  );
  assert.equal(output.includes("NEXT_PUBLIC_APP_URL"), false);
});
