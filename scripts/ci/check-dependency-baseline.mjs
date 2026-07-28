import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT_REQUIREMENTS = [
  ["node_modules/postcss", "8.5.10"],
  ["node_modules/sharp", "0.35.0"],
];

const OPTIONAL_NESTED_REQUIREMENTS = [
  ["node_modules/next/node_modules/postcss", "8.5.10"],
  ["node_modules/next/node_modules/sharp", "0.35.0"],
];

function compareVersions(left, right) {
  const a = left.split(".").map(Number);
  const b = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function evaluateDependencyBaseline(packages) {
  const failures = [];
  for (const [path, minimum] of ROOT_REQUIREMENTS) {
    const version = packages[path]?.version;
    if (!version) {
      failures.push(`${path} is missing from package-lock.json`);
    } else if (compareVersions(version, minimum) < 0) {
      failures.push(`${path} must be >= ${minimum} (found ${version})`);
    }
  }
  for (const [path, minimum] of OPTIONAL_NESTED_REQUIREMENTS) {
    const version = packages[path]?.version;
    if (version && compareVersions(version, minimum) < 0) {
      failures.push(`${path} must be >= ${minimum} (found ${version})`);
    }
  }
  return failures;
}

async function main() {
  const lockPath = new URL("../../package-lock.json", import.meta.url);
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  const failures = evaluateDependencyBaseline(lock.packages ?? {});
  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log("DEPENDENCY_BASELINE_PASS: patched PostCSS and Sharp transitive versions verified");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
