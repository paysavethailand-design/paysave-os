import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateProductionGate } from "./evaluate-production-gate.mjs";

const WORKSTREAMS = [
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
];

function passingEvidence() {
  return {
    schemaVersion: 1,
    deploymentAuthorized: true,
    productionAccessAuthorized: true,
    immutableArtifactVerified: true,
    ctoGoApproved: true,
    workstreams: Object.fromEntries(
      WORKSTREAMS.map((name) => [
        name,
        { status: "PASS", externalEvidenceVerified: true, blockers: [] },
      ]),
    ),
  };
}

test("production gate fails closed when external evidence and approval are absent", () => {
  const result = evaluateProductionGate({
    schemaVersion: 1,
    deploymentAuthorized: false,
    productionAccessAuthorized: false,
    immutableArtifactVerified: false,
    ctoGoApproved: false,
    workstreams: {
      environment: { status: "PASS", externalEvidenceVerified: false, blockers: ["runtime"] },
    },
  });

  assert.equal(result.readyForOfficialLaunch, false);
  assert.ok(result.failures.includes("deploymentAuthorized must be true"));
  assert.ok(result.failures.includes("environment.externalEvidenceVerified must be true"));
  assert.ok(result.failures.includes("lineOa evidence is missing"));
});

test("production gate passes only complete externally verified evidence", () => {
  assert.deepEqual(evaluateProductionGate(passingEvidence()), {
    readyForOfficialLaunch: true,
    failures: [],
  });
});
