import test from "node:test";
import assert from "node:assert/strict";
import { evaluateBetaGate } from "./evaluate-beta-gate.mjs";

const passingEvidence = {
  schemaVersion: 1,
  deploymentAuthorized: false,
  productionAccessAuthorized: false,
  architectureChanged: false,
  databaseSchemaChanged: false,
  workstreams: {
    environment: { status: "PASS", externalEvidenceVerified: true, blockers: [] },
    observability: { status: "PASS", externalEvidenceVerified: true, blockers: [] },
    resilience: { status: "PASS", externalEvidenceVerified: true, blockers: [] },
    security: { status: "PASS", externalEvidenceVerified: true, blockers: [] },
  },
};

test("opens review proposal only when all workstreams and external evidence pass", () => {
  assert.deepEqual(evaluateBetaGate(passingEvidence), {
    eligibleForCtoProposal: true,
    failures: [],
  });
});

test("fails closed when any workstream is blocked", () => {
  const evidence = structuredClone(passingEvidence);
  evidence.workstreams.resilience = {
    status: "BLOCKED",
    externalEvidenceVerified: false,
    blockers: ["staging_restore_drill_missing"],
  };
  assert.deepEqual(evaluateBetaGate(evidence), {
    eligibleForCtoProposal: false,
    failures: [
      "resilience.status must be PASS",
      "resilience.externalEvidenceVerified must be true",
      "resilience.blockers must be empty",
    ],
  });
});

test("fails closed on missing workstreams or prohibited actions", () => {
  const evidence = structuredClone(passingEvidence);
  delete evidence.workstreams.security;
  evidence.deploymentAuthorized = true;
  evidence.productionAccessAuthorized = true;
  assert.deepEqual(evaluateBetaGate(evidence), {
    eligibleForCtoProposal: false,
    failures: [
      "deploymentAuthorized must be false",
      "productionAccessAuthorized must be false",
      "security evidence is missing",
    ],
  });
});
