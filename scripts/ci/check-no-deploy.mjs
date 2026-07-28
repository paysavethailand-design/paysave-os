import { readFile } from "node:fs/promises";

const workflowPath = new URL("../../.github/workflows/cd.yml", import.meta.url);
const source = await readFile(workflowPath, "utf8");
const normalized = source.toLowerCase();
const forbiddenTokens = [
  "contents: write",
  "packages: write",
  "deployments: write",
  "docker push",
  "kubectl ",
  "helm install",
  "helm upgrade",
  "npm publish",
  "gh release create",
  "aws deploy",
  "gcloud deploy",
  "az deploy",
  "update-service",
];
const violations = forbiddenTokens.filter((token) => normalized.includes(token));
if (!normalized.includes("workflow_dispatch:"))
  violations.push("manual-workflow-dispatch-required");
if (/^\s{2}(push|pull_request|schedule):/m.test(source))
  violations.push("automatic-trigger-is-forbidden");
if (!/deploy:\s*false/i.test(source)) violations.push("explicit-deploy-false-required");
if (violations.length > 0) {
  console.error("CD no-deploy policy failed:", violations);
  process.exit(1);
}
console.log("NO_DEPLOY_POLICY_PASS: manual evidence promotion only; no deployment primitive found");
