import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REQUIRED_REMOVALS = [
  "/usr/local/lib/node_modules/npm",
  "/usr/local/bin/npm",
  "/usr/local/bin/npx",
];

export function evaluateRuntimeDockerfile(source) {
  const failures = [];
  const stages = String(source).split(/(?=^FROM\s)/im);
  const runner = stages.find((stage) => /^FROM\s+[^\n]+\s+AS\s+runner\b/im.test(stage));
  if (!runner) return ["runner stage is required"];
  const removesNpmTooling =
    /RUN\s+rm\s+-rf\b/i.test(runner) && REQUIRED_REMOVALS.every((path) => runner.includes(path));
  if (!removesNpmTooling) failures.push("runner must remove npm and npx tooling");

  const user = runner.match(/^USER\s+(\S+)/im)?.[1];
  if (!user || user === "root" || user === "0") failures.push("runner must set a non-root USER");

  return failures;
}

function runCli() {
  const dockerfile = process.argv[2] ?? "docker/Dockerfile";
  const failures = evaluateRuntimeDockerfile(readFileSync(dockerfile, "utf8"));
  if (failures.length > 0) {
    console.error("RUNTIME_CONTAINER_POLICY_FAIL");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("RUNTIME_CONTAINER_POLICY_PASS");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) runCli();
