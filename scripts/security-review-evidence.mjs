import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { findArchitectureViolations } from "./check-architecture.mjs";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRECTORIES = new Set(["node_modules", ".next", "coverage", "dist"]);
const DEFAULT_ARTIFACT = "packages/security/src/security-review-architecture-evidence.json";

async function collectSourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(absolutePath)));
    else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(absolutePath);
  }
  return files;
}

async function sourceDigest(projectRoot) {
  const root = resolve(projectRoot);
  const roots = [join(root, "apps", "web", "src"), join(root, "packages")];
  const files = (await Promise.all(roots.map(collectSourceFiles))).flat().sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const normalized = relative(root, file).split(sep).join("/");
    hash.update(normalized);
    hash.update("\0");
    const content = await readFile(file, "utf8");
    hash.update(content.replace(/\r\n?/g, "\n"));
    hash.update("\0");
  }
  return { digest: hash.digest("hex"), fileCount: files.length };
}

/** Creates immutable evidence tied to the exact source tree scanned by the architecture checker. */
export async function createSecurityReviewEvidence(projectRoot, clock = () => new Date()) {
  const [violations, source] = await Promise.all([
    findArchitectureViolations(projectRoot),
    sourceDigest(projectRoot),
  ]);
  return Object.freeze({
    schemaVersion: 1,
    architectureGatePassed: violations.length === 0,
    violationCount: violations.length,
    sourceDigest: source.digest,
    sourceFileCount: source.fileCount,
    verifiedAt: clock().toISOString(),
  });
}

export async function writeSecurityReviewEvidence(
  projectRoot,
  artifactPath = DEFAULT_ARTIFACT,
  clock = () => new Date(),
) {
  const evidence = await createSecurityReviewEvidence(projectRoot, clock);
  await writeFile(
    resolve(projectRoot, artifactPath),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  return evidence;
}

export async function verifySecurityReviewEvidence(projectRoot, artifactPath = DEFAULT_ARTIFACT) {
  const current = await createSecurityReviewEvidence(projectRoot);
  const stored = JSON.parse(await readFile(resolve(projectRoot, artifactPath), "utf8"));
  const matches =
    stored.schemaVersion === current.schemaVersion &&
    stored.architectureGatePassed === current.architectureGatePassed &&
    stored.violationCount === current.violationCount &&
    stored.sourceDigest === current.sourceDigest &&
    stored.sourceFileCount === current.sourceFileCount;
  if (!matches) {
    throw new Error(
      `Security Review architecture evidence is missing or stale ` +
        `(stored digest=${stored.sourceDigest}, files=${stored.sourceFileCount}, ` +
        `violations=${stored.violationCount}; current digest=${current.sourceDigest}, ` +
        `files=${current.sourceFileCount}, violations=${current.violationCount})`,
    );
  }
  return stored;
}

async function runCli() {
  const write = process.argv.includes("--write");
  const projectRoot = process.cwd();
  if (write) {
    const evidence = await writeSecurityReviewEvidence(projectRoot);
    console.log(
      `Security Review evidence: WRITTEN (${evidence.sourceFileCount} files, ${evidence.violationCount} violations)`,
    );
    return;
  }
  const evidence = await verifySecurityReviewEvidence(projectRoot);
  console.log(
    `Security Review evidence: PASS (${evidence.sourceFileCount} files, digest verified)`,
  );
}

const executedFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedFile === import.meta.url) {
  try {
    await runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
