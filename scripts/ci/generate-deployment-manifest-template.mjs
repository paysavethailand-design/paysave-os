import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import {
  currentGitRevision,
  releaseIdentityEnvironment,
  resolveReleaseIdentity,
} from "./release-identity.mjs";

const args = process.argv.slice(2);
const githubEnvIndex = args.indexOf("--github-env");
const githubEnvPath = githubEnvIndex >= 0 ? args[githubEnvIndex + 1] : undefined;
if (githubEnvIndex >= 0 && !githubEnvPath) {
  throw new Error("--github-env requires a path");
}
const positionalArgs = args.filter((argument, index) => {
  if (argument === "--github-env") return false;
  if (githubEnvIndex >= 0 && index === githubEnvIndex + 1) return false;
  return true;
});
const outputPath = positionalArgs[0] ?? "deploy/deployment-manifest.json";
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const hasManagedRevision = Boolean(
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.PAYSAVE_SOURCE_REVISION,
);
const identity = resolveReleaseIdentity({
  environment: process.env,
  packageVersion: packageJson.version,
  ...(hasManagedRevision ? {} : { fallbackRevision: currentGitRevision() }),
});
const runtimeEnvironment = releaseIdentityEnvironment(identity);

if (githubEnvPath) {
  await appendFile(
    githubEnvPath,
    Object.entries(runtimeEnvironment)
      .map(([name, value]) => `${name}=${value}`)
      .join("\n") + "\n",
  );
}

const manifest = {
  schemaVersion: 1,
  application: "paysave-os",
  releaseVersion: identity.releaseVersion,
  releaseEligibility: "blocked",
  sourceRevision: identity.sourceRevision,
  artifact: {
    file: "paysave-os-image.tar.gz",
    sha256: "SET_BY_CI",
    imageReference: "SET_BY_CI",
  },
  createdAt: identity.buildTime,
  createdBy: "paysave-os-ci",
  runtime: {
    nodeMajor: 22,
    postgresMajor: 17,
    runAsNonRoot: true,
    healthPath: "/healthz",
    readOnlyRootFilesystem: true,
    allowPrivilegeEscalation: false,
    dropCapabilities: ["ALL"],
    seccompProfile: "RuntimeDefault",
  },
  database: {
    changeAuthorized: false,
    migrationsIncluded: false,
    migrationRange: "M001-M018",
    compatibilityBaseline: "PostgreSQL 17",
  },
  promotion: {
    deploy: false,
    buildOnce: true,
    promoteByDigest: true,
    environments: {
      development: { approvalRequired: true, source: "same-artifact-digest" },
      staging: { approvalRequired: true, source: "same-artifact-digest" },
      production: { approvalRequired: true, source: "same-artifact-digest" },
    },
  },
};
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`DEPLOYMENT_MANIFEST_TEMPLATE_CREATED ${outputPath} source=${identity.sourceRevision}`);
