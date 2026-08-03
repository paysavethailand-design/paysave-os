import { execFileSync } from "node:child_process";

const fullCommitSha = /^[0-9a-f]{40}$/;

function requiredString(value, name) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

export function currentGitRevision(cwd = process.cwd()) {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

export function resolveReleaseIdentity({
  environment = process.env,
  packageVersion,
  now = () => new Date(),
  fallbackRevision,
} = {}) {
  const releaseVersion = requiredString(
    environment.PAYSAVE_RELEASE_VERSION ?? environment.RELEASE_VERSION ?? packageVersion,
    "release version",
  );
  const sourceRevision = requiredString(
    environment.PAYSAVE_SOURCE_REVISION ??
      environment.GITHUB_SHA ??
      environment.VERCEL_GIT_COMMIT_SHA ??
      fallbackRevision,
    "source revision",
  );
  if (!fullCommitSha.test(sourceRevision)) {
    throw new Error("source revision must be a full 40-character commit SHA");
  }

  const buildTime = requiredString(
    environment.PAYSAVE_BUILD_TIME ?? now().toISOString(),
    "build time",
  );
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(buildTime) ||
    Number.isNaN(Date.parse(buildTime))
  ) {
    throw new Error("build time must be a UTC ISO 8601 timestamp");
  }

  return { releaseVersion, sourceRevision, buildTime };
}

export function releaseIdentityEnvironment(identity) {
  return {
    PAYSAVE_RELEASE_VERSION: identity.releaseVersion,
    PAYSAVE_SOURCE_REVISION: identity.sourceRevision,
    PAYSAVE_BUILD_TIME: identity.buildTime,
  };
}

export function frozenReleaseIdentity(environment = process.env) {
  return resolveReleaseIdentity({
    environment: {
      PAYSAVE_RELEASE_VERSION: environment.PAYSAVE_RELEASE_VERSION,
      PAYSAVE_SOURCE_REVISION: environment.PAYSAVE_SOURCE_REVISION,
      PAYSAVE_BUILD_TIME: environment.PAYSAVE_BUILD_TIME,
    },
  });
}
