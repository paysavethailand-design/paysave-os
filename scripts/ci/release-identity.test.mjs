import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { releaseIdentityEnvironment, resolveReleaseIdentity } from "./release-identity.mjs";

const githubSha = "1".repeat(40);
const vercelSha = "2".repeat(40);
const buildTime = "2026-08-03T12:34:56.789Z";

test("resolves GitHub release identity from the CI release version, full GITHUB_SHA, and one build timestamp", () => {
  const identity = resolveReleaseIdentity({
    environment: {
      RELEASE_VERSION: "2.4.6",
      GITHUB_SHA: githubSha,
      VERCEL_GIT_COMMIT_SHA: vercelSha,
    },
    packageVersion: "0.1.0",
    now: () => new Date(buildTime),
  });

  assert.deepEqual(identity, {
    releaseVersion: "2.4.6",
    sourceRevision: githubSha,
    buildTime,
  });
  assert.deepEqual(releaseIdentityEnvironment(identity), {
    PAYSAVE_RELEASE_VERSION: "2.4.6",
    PAYSAVE_SOURCE_REVISION: githubSha,
    PAYSAVE_BUILD_TIME: buildTime,
  });
});

test("uses package version and Vercel Git system revision for a Vercel build", () => {
  const identity = resolveReleaseIdentity({
    environment: { VERCEL_GIT_COMMIT_SHA: vercelSha },
    packageVersion: "0.1.0",
    now: () => new Date(buildTime),
  });

  assert.deepEqual(identity, {
    releaseVersion: "0.1.0",
    sourceRevision: vercelSha,
    buildTime,
  });
});

test("preserves a frozen PAYSAVE identity when ambient provider variables are also present", () => {
  const frozenSha = "3".repeat(40);
  const identity = resolveReleaseIdentity({
    environment: {
      PAYSAVE_RELEASE_VERSION: "3.2.1",
      PAYSAVE_SOURCE_REVISION: frozenSha,
      PAYSAVE_BUILD_TIME: buildTime,
      RELEASE_VERSION: "9.9.9",
      GITHUB_SHA: githubSha,
      VERCEL_GIT_COMMIT_SHA: vercelSha,
    },
    packageVersion: "0.1.0",
    now: () => new Date("2027-01-01T00:00:00.000Z"),
  });

  assert.deepEqual(identity, {
    releaseVersion: "3.2.1",
    sourceRevision: frozenSha,
    buildTime,
  });
});

test("rejects a source revision that is not a full 40-character commit SHA", () => {
  assert.throws(
    () =>
      resolveReleaseIdentity({
        environment: { GITHUB_SHA: "abc123" },
        packageVersion: "0.1.0",
        now: () => new Date(buildTime),
      }),
    /full 40-character commit SHA/,
  );
});

test("rejects a build time that is parseable but not canonical UTC ISO 8601", () => {
  assert.throws(
    () =>
      resolveReleaseIdentity({
        environment: {
          PAYSAVE_RELEASE_VERSION: "0.1.0",
          PAYSAVE_SOURCE_REVISION: githubSha,
          PAYSAVE_BUILD_TIME: "2026-08-03T12:34:56+07:00",
        },
      }),
    /UTC ISO 8601/,
  );
});

test("deployment manifest maps the exact frozen runtime identity", () => {
  const directory = mkdtempSync(join(tmpdir(), "paysave-release-identity-"));
  const imagePath = join(directory, "image.tar.gz");
  const outputPath = join(directory, "deployment-manifest.json");
  writeFileSync(imagePath, "synthetic image bytes");

  const frozenEnvironment = {
    ...process.env,
    GITHUB_SHA: "f".repeat(40),
    RELEASE_VERSION: "9.9.9-conflict",
    PAYSAVE_RELEASE_VERSION: "2.4.6",
    PAYSAVE_SOURCE_REVISION: githubSha,
    PAYSAVE_BUILD_TIME: buildTime,
    RELEASE_ELIGIBLE: "true",
  };
  const generated = spawnSync(
    process.execPath,
    ["scripts/ci/generate-deployment-manifest-template.mjs"],
    { cwd: process.cwd(), encoding: "utf8", env: frozenEnvironment },
  );
  assert.equal(generated.status, 0, generated.stderr);

  const result = spawnSync(
    process.execPath,
    ["scripts/ci/create-artifact-manifest.mjs", imagePath, outputPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: frozenEnvironment,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(readFileSync(outputPath, "utf8"));
  assert.equal(manifest.releaseVersion, "2.4.6");
  assert.equal(manifest.sourceRevision, githubSha);
  assert.equal(manifest.createdAt, buildTime);
});

test("deployment manifest generator never emits release identity placeholders", () => {
  const directory = mkdtempSync(join(tmpdir(), "paysave-deployment-manifest-"));
  const outputPath = join(directory, "deployment-manifest.json");
  const isolatedEnvironment = { ...process.env };
  delete isolatedEnvironment.GITHUB_SHA;
  delete isolatedEnvironment.VERCEL_GIT_COMMIT_SHA;
  delete isolatedEnvironment.RELEASE_VERSION;
  Object.assign(isolatedEnvironment, {
    PAYSAVE_RELEASE_VERSION: "2.4.6",
    PAYSAVE_SOURCE_REVISION: githubSha,
    PAYSAVE_BUILD_TIME: buildTime,
  });
  const result = spawnSync(
    process.execPath,
    ["scripts/ci/generate-deployment-manifest-template.mjs", outputPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: isolatedEnvironment,
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(readFileSync(outputPath, "utf8"));
  assert.equal(manifest.releaseVersion, "2.4.6");
  assert.equal(manifest.sourceRevision, githubSha);
  assert.equal(manifest.createdAt, buildTime);
  assert.doesNotMatch(
    JSON.stringify({
      releaseVersion: manifest.releaseVersion,
      sourceRevision: manifest.sourceRevision,
      createdAt: manifest.createdAt,
    }),
    /SET_BY_CI|ci-template/,
  );
});
