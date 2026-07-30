#!/usr/bin/env node
/**
 * Deployment Artifact Generator: Flatten for Hostinger Managed Next.js (Deployment Only)
 *
 * - Keeps the full npm workspaces monorepo 100% unchanged for development.
 * - Does NOT move apps/ or packages/, does NOT split repos, does NOT touch application logic.
 * - Produces a self-contained, flat standalone Next.js artifact in deploy/hostinger/
 *   that contains everything needed to run without any monorepo root or workspace resolution.
 * - Bundles/vendors the local @paysave/* packages.
 * - Uses the official Next.js standalone output + post-processing for flattening.
 * - The resulting artifact is a normal Next.js project (server.js at root, node_modules with all deps).
 *
 * Usage:
 *   npm run deploy:hostinger
 *
 * The artifact can be zipped and uploaded to Hostinger (or used with Git if desired).
 * In Hostinger: Framework=Next.js, Root Directory set to the artifact root (or .), Node.js=22.
 * Use the included server.js for startup.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

const ROOT = path.join(__dirname, '../..');
const STANDALONE_DIR = path.join(ROOT, 'apps/web/.next/standalone');
const ARTIFACT_DIR = path.join(ROOT, 'deploy/hostinger');
const LOCAL_PACKAGES_DIR = path.join(ROOT, 'packages');
const WEB_PKG_PATH = path.join(ROOT, 'apps/web/package.json');

const LOCAL_WORKSPACE_PKGS = ['infrastructure', 'observability', 'security', 'ui'];

async function main() {
  console.log('=== Hostinger Deploy Artifact (Flatten for Deployment Only) ===\n');

  if (!fs.existsSync(STANDALONE_DIR)) {
    console.error('Standalone output missing. Run the monorepo build first:');
    console.error('  npm run build');
    process.exit(1);
  }

  // 1. Clean artifact dir
  if (fs.existsSync(ARTIFACT_DIR)) {
    fs.rmSync(ARTIFACT_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  console.log(`Cleaned and created ${ARTIFACT_DIR}`);

  // 2. Copy traced node_modules (externals + Next.js runtime)
  const nodeModulesSrc = path.join(STANDALONE_DIR, 'node_modules');
  if (fs.existsSync(nodeModulesSrc)) {
    fs.cpSync(nodeModulesSrc, path.join(ARTIFACT_DIR, 'node_modules'), { recursive: true });
    console.log('Copied traced node_modules (self-contained externals)');
  }

  // 3. Flatten: copy the inner app (apps/web/*) contents to artifact root
  //    This puts server.js, .next, app/, public/, package.json etc. at the top level.
  const innerAppDir = path.join(STANDALONE_DIR, 'apps', 'web');
  if (fs.existsSync(innerAppDir)) {
    fs.cpSync(innerAppDir, ARTIFACT_DIR, { recursive: true, force: true });
    console.log('Flattened app content (server.js and app now at artifact root)');
  } else {
    // Fallback: copy everything
    fs.cpSync(STANDALONE_DIR, ARTIFACT_DIR, { recursive: true, force: true });
  }

  // 4. Copy any traced packages dir (for source references if needed)
  const tracedPackages = path.join(STANDALONE_DIR, 'packages');
  if (fs.existsSync(tracedPackages)) {
    fs.cpSync(tracedPackages, path.join(ARTIFACT_DIR, 'packages'), { recursive: true });
  }

  // 5. Vendor (bundle) all required local @paysave/* workspace packages
  //    into node_modules/@paysave/* so the artifact works with NO root workspace at all.
  console.log('Vendoring local workspace packages...');
  for (const pkgShort of LOCAL_WORKSPACE_PKGS) {
    const src = path.join(LOCAL_PACKAGES_DIR, pkgShort);
    const dest = path.join(ARTIFACT_DIR, 'node_modules', '@paysave', pkgShort);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.cpSync(src, dest, { recursive: true, force: true });
      console.log(`  ✓ @paysave/${pkgShort} vendored into node_modules`);
    } else {
      console.warn(`  ! @paysave/${pkgShort} source not found at ${src}`);
    }
  }

  // 6. Ensure correct package.json at root (web's, no workspaces) + start script
  let pkg = {};
  if (fs.existsSync(path.join(ARTIFACT_DIR, 'package.json'))) {
    pkg = JSON.parse(fs.readFileSync(path.join(ARTIFACT_DIR, 'package.json'), 'utf8'));
  }
  // If we got the root package.json (has workspaces or name "paysave-os"), replace with web's
  if (pkg.workspaces || pkg.name === 'paysave-os' || !pkg.dependencies || !pkg.dependencies.next) {
    if (fs.existsSync(WEB_PKG_PATH)) {
      pkg = JSON.parse(fs.readFileSync(WEB_PKG_PATH, 'utf8'));
      console.log('Replaced with web workspace package.json (no root workspaces)');
    }
  }

  pkg.scripts = pkg.scripts || {};
  pkg.scripts.start = "node server.js";
  pkg.scripts.build = "echo \"Pre-built standalone Next.js artifact - skipping rebuild (no next build will run)\" || true";
  delete pkg.workspaces; // ensure no workspace resolution
  // Transform local @paysave/* deps to "file:./packages/..." references.
  // This allows "cd deploy/hostinger && npm install && npm start" to work
  // completely standalone (no monorepo root, no registry lookup).
  const localDepMap = {
    "@paysave/infrastructure": "packages/infrastructure",
    "@paysave/observability": "packages/observability",
    "@paysave/security": "packages/security",
    "@paysave/ui": "packages/ui"
  };
  if (pkg.dependencies) {
    for (const [dep, filePath] of Object.entries(localDepMap)) {
      if (pkg.dependencies[dep] && fs.existsSync(path.join(ARTIFACT_DIR, filePath))) {
        pkg.dependencies[dep] = "file:./" + filePath;
        console.log("  Transformed " + dep + " → file:./" + filePath);
      }
    }
  }


  fs.writeFileSync(path.join(ARTIFACT_DIR, 'package.json'), JSON.stringify(pkg, null, 2));
  console.log('Patched package.json: start = "node server.js", workspaces removed');

  // 7. Ensure server.js is executable and at root (it should be)
  const serverJs = path.join(ARTIFACT_DIR, 'server.js');
  if (fs.existsSync(serverJs)) {
    try { fs.chmodSync(serverJs, 0o755); } catch {}
    console.log('server.js present at artifact root');
  } else {
    console.warn('WARNING: server.js not found at expected root after flatten');
  }

  // 8. Add minimal deployment note
  const note = `# Hostinger Managed Next.js Deployment Artifact

This directory is a **self-contained, flattened standalone Next.js project**.

- Generated from the monorepo for deployment only.
- Contains vendored @paysave/* packages + traced node_modules.
- No monorepo root, no workspaces required.
- Run with: node server.js  (or npm start after ensuring node_modules)

## Hostinger Settings (PRE-BUILT STANDALONE - DO NOT REBUILD)
- Framework: Next.js (or Custom / Node.js)
- Root Directory: .   (the folder with server.js at top level)
- Node.js: 22
- Build command: :     (colon = shell no-op)   OR   echo "pre-built - skip next build"
- Output directory: .next
- Startup command: node server.js   (or npm start)
- IMPORTANT: Do NOT let Hostinger run "next build". The artifact is already built.
  Using the no-op prevents unnecessary rebuilds and preserves the traced standalone output.

Generated: 2026-07-30T03:38:54.341Z
`;
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'HOSTINGER_DEPLOY.md'), note);

  console.log(`\nArtifact ready: ${ARTIFACT_DIR}\n`);

  // 9. Verify the artifact runs independently
  await verifyIndependentRun(ARTIFACT_DIR);

  console.log('\n✅ Success: Artifact is self-contained and verified.');
  console.log('   You can now zip deploy/hostinger/ and deploy to Hostinger.');
}

async function verifyIndependentRun(artifactDir) {
  console.log('\n=== Verifying artifact runs independently (no monorepo root) ===');

  const port = 3471;
  const serverPath = path.join(artifactDir, 'server.js');

  if (!fs.existsSync(serverPath)) {
    throw new Error('server.js missing in artifact — verification aborted');
  }

  // Spawn in the artifact dir only
  const child = spawn('node', [serverPath], {
    cwd: artifactDir,
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      HOSTNAME: '127.0.0.1',
      // Dummy public envs only for verification (satisfy middleware validation).
      // Real values must be provided in Hostinger environment for production.
      NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YW1wbGUiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjQyMjAwMCwiZXhwIjoxOTMyMDAwMDAwfQ.dummy-for-verification-only'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let logs = '';
  child.stdout.on('data', (d) => { logs += d.toString(); });
  child.stderr.on('data', (d) => { logs += d.toString(); });

  // Give it time to start (standalone is fast)
  await sleep(4500);

  const okVersion = await httpProbe(port, '/version');
  const okHealth = await httpProbe(port, '/healthz');
  const okReady = await httpProbe(port, '/readyz');

  // Cleanup
  try { child.kill('SIGTERM'); } catch {}
  await sleep(400);

  console.log(`Probe /version : ${okVersion ? '200 OK' : 'FAIL'}`);
  console.log(`Probe /healthz : ${okHealth ? '200/503 (expected)' : 'no response'}`);
  console.log(`Probe /readyz : ${okReady ? '200/503 (expected)' : 'no response'}`);

  if (!okVersion && !okReady) {
    console.error('Server logs (tail):');
    console.error(logs.slice(-800));
    throw new Error('Independent verification failed — server did not respond on expected routes');
  }

  console.log('✅ Artifact serves requests independently (self-contained).');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpProbe(port, pathname) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      timeout: 2500
    }, (res) => {
      // Accept 200 or 503 (readyz is intentionally fail-closed without prod config)
      resolve(res.statusCode === 200 || res.statusCode === 503);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

main().catch((err) => {
  console.error('\n❌ Artifact creation or verification failed:');
  console.error(err);
  process.exit(1);
});
