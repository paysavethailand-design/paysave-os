import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const WORKSTREAMS = ["environment", "observability", "resilience", "security"];

export function evaluateBetaGate(evidence) {
  const failures = [];
  if (evidence?.deploymentAuthorized !== false) failures.push("deploymentAuthorized must be false");
  if (evidence?.productionAccessAuthorized !== false)
    failures.push("productionAccessAuthorized must be false");
  if (evidence?.architectureChanged !== false) failures.push("architectureChanged must be false");
  if (evidence?.databaseSchemaChanged !== false)
    failures.push("databaseSchemaChanged must be false");

  for (const name of WORKSTREAMS) {
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

  return { eligibleForCtoProposal: failures.length === 0, failures };
}

async function main() {
  const path = process.argv[2];
  if (!path) throw new Error("Usage: evaluate-beta-gate.mjs <evidence.json>");
  const evidence = JSON.parse(await readFile(path, "utf8"));
  const result = evaluateBetaGate(evidence);
  if (result.eligibleForCtoProposal) {
    console.log("BETA_GATE_CTO_PROPOSAL_ELIGIBLE");
    return;
  }
  console.log("BETA_GATE_HOLD");
  for (const failure of result.failures) console.log(`- ${failure}`);
  process.exitCode = 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
