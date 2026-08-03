import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

import {
  currentGitRevision,
  releaseIdentityEnvironment,
  resolveReleaseIdentity,
} from "../../scripts/ci/release-identity.mjs";

const repositoryRoot = path.join(__dirname, "../../");
const packageJson = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8")) as {
  version: string;
};
const hasManagedRevision = Boolean(
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.PAYSAVE_SOURCE_REVISION,
);
const releaseIdentity = resolveReleaseIdentity({
  environment: process.env,
  packageVersion: packageJson.version,
  ...(hasManagedRevision ? {} : { fallbackRevision: currentGitRevision(repositoryRoot) }),
});

const nextConfig: NextConfig = {
  output: "standalone",
  // Required for correct tracing of workspace packages in monorepo when producing standalone output.
  // The tracing root is the monorepo root so local @paysave/* packages are included in the artifact.
  outputFileTracingRoot: repositoryRoot,
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Non-secret release metadata is frozen once at build time and inlined for Vercel server functions.
  env: releaseIdentityEnvironment(releaseIdentity),
};

export default nextConfig;
