import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  currentGitRevision,
  releaseIdentityEnvironment,
  resolveReleaseIdentity,
} from "./release-identity.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(scriptDirectory, "../..");
const webRoot = join(repositoryRoot, "apps/web");
const packageJson = JSON.parse(readFileSync(join(repositoryRoot, "package.json"), "utf8"));
const hasManagedRevision = Boolean(
  process.env.GITHUB_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.PAYSAVE_SOURCE_REVISION,
);
const identity = resolveReleaseIdentity({
  environment: process.env,
  packageVersion: packageJson.version,
  ...(hasManagedRevision ? {} : { fallbackRevision: currentGitRevision(repositoryRoot) }),
});
const runtimeEnvironment = releaseIdentityEnvironment(identity);

console.log(
  `RELEASE_IDENTITY_BUILD version=${identity.releaseVersion} source=${identity.sourceRevision} buildTime=${identity.buildTime}`,
);
const result = spawnSync(
  process.execPath,
  [join(repositoryRoot, "node_modules/next/dist/bin/next"), "build"],
  {
    cwd: webRoot,
    env: { ...process.env, ...runtimeEnvironment },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
