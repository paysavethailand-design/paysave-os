import { readFile } from "node:fs/promises";

const path = process.argv[2];
if (!path)
  throw new Error("Usage: validate-deployment-manifest.mjs <manifest.json> [--allow-template]");
const allowTemplate = process.argv.includes("--allow-template");
const requireEligible = process.argv.includes("--require-eligible");
const manifest = JSON.parse(await readFile(path, "utf8"));
const errors = [];
const requireValue = (condition, message) => {
  if (!condition) errors.push(message);
};
requireValue(manifest.schemaVersion === 1, "schemaVersion must equal 1");
requireValue(manifest.application === "paysave-os", "application must equal paysave-os");
requireValue(
  typeof manifest.releaseVersion === "string" && manifest.releaseVersion.length > 0,
  "releaseVersion is required",
);
requireValue(
  typeof manifest.sourceRevision === "string" && manifest.sourceRevision.length > 0,
  "sourceRevision is required",
);
requireValue(
  ["blocked", "passed"].includes(manifest.releaseEligibility),
  "releaseEligibility must be blocked or passed",
);
if (requireEligible)
  requireValue(manifest.releaseEligibility === "passed", "releaseEligibility must be passed");
requireValue(manifest.runtime?.nodeMajor === 22, "runtime.nodeMajor must equal 22");
requireValue(manifest.runtime?.postgresMajor === 17, "runtime.postgresMajor must equal 17");
requireValue(manifest.runtime?.runAsNonRoot === true, "runtime.runAsNonRoot must be true");
requireValue(manifest.runtime?.healthPath === "/healthz", "runtime.healthPath must equal /healthz");
requireValue(
  manifest.runtime?.readOnlyRootFilesystem === true,
  "runtime.readOnlyRootFilesystem must be true",
);
requireValue(
  manifest.runtime?.allowPrivilegeEscalation === false,
  "runtime.allowPrivilegeEscalation must be false",
);
requireValue(
  Array.isArray(manifest.runtime?.dropCapabilities) &&
    manifest.runtime.dropCapabilities.length === 1 &&
    manifest.runtime.dropCapabilities[0] === "ALL",
  "runtime.dropCapabilities must contain only ALL",
);
requireValue(
  manifest.runtime?.seccompProfile === "RuntimeDefault",
  "runtime.seccompProfile must equal RuntimeDefault",
);
requireValue(
  manifest.database?.changeAuthorized === false,
  "database changes must remain unauthorized",
);
requireValue(
  manifest.database?.migrationsIncluded === false,
  "release package must not include migrations",
);
requireValue(manifest.promotion?.deploy === false, "promotion.deploy must remain false");
requireValue(manifest.promotion?.buildOnce === true, "buildOnce must be true");
requireValue(manifest.promotion?.promoteByDigest === true, "promoteByDigest must be true");
for (const environment of ["development", "staging", "production"]) {
  requireValue(
    Boolean(manifest.promotion?.environments?.[environment]),
    `missing ${environment} policy`,
  );
}
requireValue(
  /^[0-9a-f]{40}$/.test(manifest.sourceRevision),
  "sourceRevision must be a full 40-character commit SHA",
);
if (!allowTemplate) {
  requireValue(
    /^[0-9a-f]{64}$/.test(manifest.artifact?.sha256),
    "artifact.sha256 must be a 64-character SHA-256 digest",
  );
} else {
  requireValue(
    manifest.artifact?.sha256 === "SET_BY_CI",
    "template artifact.sha256 must be SET_BY_CI",
  );
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join(String.fromCharCode(10)));
  process.exit(1);
}
console.log(`DEPLOYMENT_MANIFEST_PASS ${path} deploy=false`);
