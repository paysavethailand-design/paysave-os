import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const PRODUCTION_WORKSTREAMS = Object.freeze([
  "environment",
  "deployment",
  "domainTls",
  "secrets",
  "observability",
  "resilience",
  "security",
  "performance",
  "databaseRuntime",
  "lineOa",
  "email",
  "googleDrive",
  "externalApisWebhooks",
  "uat",
  "pilot",
  "documentation",
  "operations",
  "productionVerification",
]);

export function evaluateProductionGate(evidence) {
  const failures = [];
  if (evidence?.schemaVersion !== 1) failures.push("schemaVersion must be 1");
  if (evidence?.deploymentAuthorized !== true) failures.push("deploymentAuthorized must be true");
  if (evidence?.productionAccessAuthorized !== true)
    failures.push("productionAccessAuthorized must be true");
  if (evidence?.immutableArtifactVerified !== true)
    failures.push("immutableArtifactVerified must be true");
  if (evidence?.ctoGoApproved !== true) failures.push("ctoGoApproved must be true");

  for (const name of PRODUCTION_WORKSTREAMS) {
    const workstream = evidence?.workstreams?.[name];
    if (!workstream) {
      failures.push(`${name} evidence is missing`);
      continue;
    }
    if (workstream.status !== "PASS") failures.push(`${name}.status must be PASS`);
    if (workstream.externalEvidenceVerified !== true)
      failures.push(`${name}.externalEvidenceVerified must be true`);
    if (!Array.isArray(workstream.blockers) || workstream.blockers.length !== 0)
      failures.push(`${name}.blockers must be empty`);
  }

  return { readyForOfficialLaunch: failures.length === 0, failures };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: evaluate-production-gate.mjs <evidence.json>");
  const result = evaluateProductionGate(JSON.parse(await readFile(path, "utf8")));
  if (result.readyForOfficialLaunch) {
    console.log("PRODUCTION_GATE_OFFICIAL_LAUNCH_READY");
    return;
  }
  console.log("PRODUCTION_GATE_HOLD");
  for (const failure of result.failures) console.log(`- ${failure}`);
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
