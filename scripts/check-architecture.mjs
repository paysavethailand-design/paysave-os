import { access, readdir, readFile } from "node:fs/promises";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"]);
const IGNORED_DIRECTORIES = new Set(["node_modules", ".next", "coverage", "dist"]);
const PUBLIC_FEATURE_ENTRYPOINTS = new Set(["", "actions", "server"]);
const REQUIRED_SHARED_FOLDERS = ["config", "hooks", "lib", "providers", "services", "types"];
const UNOWNED_HORIZONTAL_PACKAGES = ["application", "data-access", "domain"];
const PROVIDER_SDK_PREFIXES = [
  "@supabase/",
  "npm:@supabase/",
  "@octokit/",
  "@aws-sdk/",
  "@azure/",
  "@google-cloud/",
  "cloudflare",
  "digitalocean",
];
const INFRASTRUCTURE_PROVIDER_SEGMENT = /(?:^|\/)(?:hostinger|supabase|github)(?:\/|$)/;
// Declared, non-`src/index.ts` package.json `exports` subpaths. Each entry here must correspond to
// an explicit subpath in that package's `exports` map (e.g. an asset the bundler must resolve
// directly, such as a stylesheet, or a module deliberately kept out of an Edge-bundled barrel).
const ALLOWED_PACKAGE_SUBPATH_EXPORTS = new Set([
  "@paysave/ui/tokens.css",
  "@paysave/security/crypto",
  "@paysave/infrastructure/read-models",
  "@paysave/infrastructure/server",
]);

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

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

function importsFrom(source) {
  return [...source.matchAll(/(?:import|export)\s+(?:[^"']*?\s+from\s+)?["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
}

function featureImport(importPath) {
  const match = importPath.match(/^@\/features\/([^/]+)(?:\/(.+))?$/);
  if (!match) return undefined;
  return { feature: match[1], entrypoint: match[2] ?? "" };
}

function currentFeature(relativePath) {
  const match = relativePath.match(/^apps\/web\/src\/features\/([^/]+)\//);
  return match?.[1];
}

function isAppRoute(relativePath) {
  return relativePath.startsWith("apps/web/src/app/");
}

function violation(rule, file, importPath) {
  return { rule, file, importPath };
}

/** Returns deterministic architecture-boundary violations without changing source files. */
export async function findArchitectureViolations(projectRoot) {
  const root = resolve(projectRoot);
  const scanRoots = [join(root, "apps", "web", "src"), join(root, "packages")];
  const files = (await Promise.all(scanRoots.map(collectSourceFiles))).flat().sort();
  const violations = [];

  if (await pathExists(join(root, "package.json"))) {
    for (const folder of REQUIRED_SHARED_FOLDERS) {
      const relativeFolder = `apps/web/src/shared/${folder}`;
      if (!(await pathExists(join(root, relativeFolder)))) {
        violations.push({
          rule: "shared-folder-missing",
          file: relativeFolder,
          importPath: "directory",
        });
      }
    }

    for (const packageName of UNOWNED_HORIZONTAL_PACKAGES) {
      const relativePackage = `packages/${packageName}`;
      if (await pathExists(join(root, relativePackage))) {
        violations.push({
          rule: "unowned-horizontal-package",
          file: relativePackage,
          importPath: "directory",
        });
      }
    }
  }

  const featuresRoot = join(root, "apps", "web", "src", "features");
  let featureEntries = [];
  try {
    featureEntries = await readdir(featuresRoot, { withFileTypes: true });
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  for (const feature of featureEntries.filter((entry) => entry.isDirectory())) {
    try {
      await access(join(featuresRoot, feature.name, "index.ts"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      violations.push({
        rule: "feature-public-api-missing",
        file: `apps/web/src/features/${feature.name}`,
        importPath: "./index.ts",
      });
    }
  }

  for (const absolutePath of files) {
    const file = relative(root, absolutePath).split(sep).join("/");
    const ownerFeature = currentFeature(file);
    const source = await readFile(absolutePath, "utf8");
    const isBusinessPlatformPath =
      file.startsWith("apps/web/src/features/business-platform/") ||
      file.startsWith("apps/web/src/app/business/");
    const isBusinessPlatformAdapter = file.startsWith(
      "apps/web/src/features/business-platform/infrastructure/",
    );

    if (
      isBusinessPlatformPath &&
      !isBusinessPlatformAdapter &&
      /\b(?:fetch|databaseProvider|createClient|ProviderExecutor)\s*\(|\.(?:execute|bootstrap|shutdown|probe)\s*\(/.test(
        source,
      )
    ) {
      violations.push(violation("business-platform-direct-runtime-access", file, "runtime-call"));
    }

    if (
      file === "packages/infrastructure/core/models/request.ts" &&
      /\bproviderId\s*[?:]/.test(source)
    ) {
      violations.push(violation("infrastructure-client-provider-selection", file, "providerId"));
    }

    for (const importPath of importsFrom(source)) {
      const importedFeature = featureImport(importPath);

      if (
        isBusinessPlatformPath &&
        !isBusinessPlatformAdapter &&
        (importPath === "pg" ||
          importPath.startsWith("pg/") ||
          importPath === "@/shared/providers" ||
          importPath.startsWith("@/shared/providers/") ||
          importPath === "@paysave/infrastructure" ||
          importPath.startsWith("@paysave/infrastructure/") ||
          PROVIDER_SDK_PREFIXES.some((prefix) => importPath.startsWith(prefix)))
      ) {
        violations.push(violation("business-platform-boundary-bypass", file, importPath));
        continue;
      }

      if (
        isAppRoute(file) &&
        importedFeature &&
        !PUBLIC_FEATURE_ENTRYPOINTS.has(importedFeature.entrypoint)
      ) {
        violations.push(violation("app-route-feature-public-api", file, importPath));
        continue;
      }

      if (
        ownerFeature &&
        importedFeature &&
        importedFeature.feature !== ownerFeature &&
        !PUBLIC_FEATURE_ENTRYPOINTS.has(importedFeature.entrypoint)
      ) {
        violations.push(violation("cross-feature-public-api", file, importPath));
        continue;
      }

      if (
        file.startsWith("packages/infrastructure/core/") &&
        INFRASTRUCTURE_PROVIDER_SEGMENT.test(importPath)
      ) {
        violations.push(violation("infrastructure-core-provider-coupling", file, importPath));
        continue;
      }

      const isMonitoringCenterPath =
        file.startsWith("apps/web/src/features/monitoring-center/") ||
        file.startsWith("apps/web/src/app/infrastructure/monitoring/");
      const isMonitoringCenterAdapter = file.startsWith(
        "apps/web/src/features/monitoring-center/infrastructure/",
      );
      if (
        isMonitoringCenterPath &&
        !isMonitoringCenterAdapter &&
        importPath === "@paysave/observability"
      ) {
        violations.push(violation("monitoring-read-model-bypass", file, importPath));
        continue;
      }

      const isDiagnosticsPath =
        file.startsWith("apps/web/src/features/diagnostics/") ||
        file.startsWith("apps/web/src/app/infrastructure/diagnostics/");
      const isDiagnosticsAdapter = file.startsWith(
        "apps/web/src/features/diagnostics/infrastructure/",
      );
      if (isDiagnosticsPath && !isDiagnosticsAdapter && importPath === "@paysave/observability") {
        violations.push(violation("diagnostics-read-model-bypass", file, importPath));
        continue;
      }

      const isSecurityReviewPath =
        file.startsWith("apps/web/src/features/security-review/") ||
        file.startsWith("apps/web/src/app/infrastructure/security-review/");
      const isSecurityReviewAdapter = file.startsWith(
        "apps/web/src/features/security-review/infrastructure/",
      );
      if (isSecurityReviewPath && !isSecurityReviewAdapter && importPath === "@paysave/security") {
        violations.push(violation("security-review-validator-bypass", file, importPath));
        continue;
      }
      if (
        isSecurityReviewPath &&
        (importPath === "@paysave/infrastructure" ||
          importPath === "@paysave/infrastructure/server" ||
          importPath.startsWith("@paysave/infrastructure/hostinger") ||
          importPath.startsWith("@paysave/infrastructure/supabase") ||
          importPath.startsWith("@paysave/infrastructure/github") ||
          importPath === "@paysave/observability" ||
          PROVIDER_SDK_PREFIXES.some((prefix) => importPath.startsWith(prefix)))
      ) {
        violations.push(violation("security-review-platform-bypass", file, importPath));
        continue;
      }

      if (
        (file.includes("/domain/") ||
          file.includes("/application/") ||
          file.includes("/presentation/") ||
          isAppRoute(file)) &&
        importPath === "@paysave/infrastructure"
      ) {
        violations.push(violation("infrastructure-layer-bypass", file, importPath));
        continue;
      }

      if (
        (file.includes("/domain/") || file.includes("/application/")) &&
        (importPath === "@paysave/infrastructure/server" ||
          importPath.startsWith("@paysave/infrastructure/hostinger") ||
          importPath.startsWith("@paysave/infrastructure/supabase") ||
          importPath.startsWith("@paysave/infrastructure/github"))
      ) {
        violations.push(violation("infrastructure-business-direct-call", file, importPath));
        continue;
      }

      if (
        (file.includes("/presentation/") || isAppRoute(file)) &&
        (importPath === "@paysave/infrastructure/server" ||
          importPath.startsWith("@paysave/infrastructure/hostinger") ||
          importPath.startsWith("@paysave/infrastructure/supabase") ||
          importPath.startsWith("@paysave/infrastructure/github"))
      ) {
        violations.push(violation("infrastructure-ui-direct-call", file, importPath));
        continue;
      }

      if (
        (file.includes("/domain/") ||
          file.includes("/application/") ||
          file.includes("/presentation/") ||
          isAppRoute(file)) &&
        PROVIDER_SDK_PREFIXES.some((prefix) => importPath.startsWith(prefix))
      ) {
        violations.push(violation("provider-sdk-boundary", file, importPath));
        continue;
      }

      if (
        /^apps\/web\/src\/features\/[^/]+\/server\.[cm]?[jt]sx?$/.test(file) &&
        ownerFeature !== "auth" &&
        (importPath.includes("/infrastructure/supabase/") ||
          importPath.startsWith("./infrastructure/supabase"))
      ) {
        violations.push(violation("database-provider-composition-boundary", file, importPath));
        continue;
      }

      if (
        file.includes("/application/") &&
        (importPath.includes("/infrastructure/") || importPath.startsWith("../infrastructure"))
      ) {
        violations.push(violation("application-dependency-direction", file, importPath));
        continue;
      }

      if (
        /(?:^|\/)packages\/[^/]+\/src\//.test(importPath) ||
        (/^@paysave\/[^/]+\//.test(importPath) && !ALLOWED_PACKAGE_SUBPATH_EXPORTS.has(importPath))
      ) {
        violations.push(violation("shared-package-public-api", file, importPath));
      }
    }
  }

  return violations.sort((left, right) =>
    `${left.file}:${left.rule}:${left.importPath}`.localeCompare(
      `${right.file}:${right.rule}:${right.importPath}`,
    ),
  );
}

async function runCli() {
  const projectRoot = process.argv[2] ?? process.cwd();
  const violations = await findArchitectureViolations(projectRoot);
  if (violations.length === 0) {
    console.log("Architecture boundaries: PASS");
    return;
  }

  console.error(`Architecture boundaries: FAIL (${violations.length})`);
  for (const item of violations) {
    console.error(`- [${item.rule}] ${item.file} -> ${item.importPath}`);
  }
  process.exitCode = 1;
}

const executedFile = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : undefined;
if (executedFile === import.meta.url) await runCli();
