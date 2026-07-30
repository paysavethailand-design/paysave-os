# Hostinger Managed Next.js Deployment

This document describes the **flatten-for-deployment-only** pipeline.

The monorepo (npm workspaces) remains completely unchanged for development.  
A deployment-only artifact is generated that is a self-contained, flat standalone Next.js project.

## Goals
- Develop in `apps/web` + `packages/*` (full monorepo).
- Deploy a normal standalone Next.js app that works on Hostinger without the monorepo root.
- Bundle all `@paysave/*` workspace packages.
- Use Next.js official `output: "standalone"`.

## One-time Setup
No changes needed to source or logic.

## Local Artifact Generation (Pre-built)
```bash
npm run deploy:hostinger
# or
npm run deploy
```

This produces `deploy/hostinger/` containing:
- Pre-built `.next/` (from monorepo `next build`)
- `server.js` (standalone entrypoint)
- Vendored local packages + dependencies
- `package.json` with:
  - `start: "node server.js"`
  - `build: "echo ... skipping rebuild ..."` (no-op to protect against accidental rebuilds)

**The artifact is already compiled. No `next build` should ever run on Hostinger.**

## GitHub Actions
The workflow automatically generates the pre-built tar.gz.

## GitHub Actions
The workflow `.github/workflows/hostinger-artifact.yml` automatically:
- Runs on push to main (relevant paths) or manual dispatch.
- Builds the monorepo + artifact.
- Uploads `hostinger-deploy-artifact-<sha>.tar.gz` as a workflow artifact.

Download the tar.gz from the Actions run → Artifacts.

## Deploying to Hostinger (Pre-built Standalone Mode)

**Goal on Hostinger: Run only `npm install` then `npm start` / `node server.js`**.  
Do **not** run `next build` — the application is pre-compiled.

### Critical Hostinger Settings (hPanel / Web Apps / Node.js)

- **Framework**: Next.js (or "Custom" / "Node.js" if Next.js option forces a build)
- **Root Directory**: `.` (must contain `server.js` at the top level of the uploaded folder)
- **Node.js**: 22
- **Build command**: `:`   (colon = no-op / do nothing)  
  **Alternative**: `echo "Pre-built standalone - skipping next build"`
  **Why?** This prevents Hostinger from re-running Next.js build on every deploy.
- **Output directory**: `.next` (or leave default)
- **Startup command** (preferred): `node server.js`  
  **Alternative**: `npm start`

**After upload/extract, the only commands Hostinger should execute are:**
1. `npm install`
2. `node server.js` (or `npm start`)

### Upload Steps
1. Download the artifact tar.gz from GitHub Actions (or run `npm run deploy` locally and zip `deploy/hostinger/`).
2. Extract the archive.
3. Upload the **contents** (or the folder) to Hostinger.
4. Confirm `server.js` is directly visible in the Root Directory.
5. Set the Build command to the no-op shown above.
6. Set the three required `NEXT_PUBLIC_*` environment variables.
7. Deploy / Restart.

### Verification that No Rebuild Occurs
- In Hostinger deployment logs, you should **not** see "Compiling...", "Creating an optimized production build", or Next.js build output.
- You should see "Ready in Xms" shortly after "npm install" / start.
- The `build` script in the deployed `package.json` is a no-op echo.
- `.next/` contents (e.g. BUILD_ID or server chunks) remain exactly as generated in the monorepo.

## How the Flattening Works (Maintainable Details)
- `outputFileTracingRoot` in `apps/web/next.config.ts` ensures local workspace packages are traced during build.
- Post-build script copies only the minimal required files from the standalone output.
- Local packages are vendored as regular directories under `node_modules/@paysave/*` (no symlink, no workspace).
- The resulting tree has `server.js` + `node_modules` + `.next` at the top level — a normal standalone Next.js layout.
- No changes are ever made to source files, `apps/`, or `packages/`.

## Troubleshooting
- **Cannot find module 'next'** at runtime: The artifact was not used as the root, or node_modules was not included in the upload. Re-generate and ensure the full `deploy/hostinger` (with node_modules) is used.
- Middleware/env errors: Set the three `NEXT_PUBLIC_*` variables in Hostinger.
- 503 on /readyz: Expected until production config + approvals are complete.

## Governance Note
This artifact is for the Infrastructure phase. Actual promotion and launch still follow the existing production gate process (`validate:production-runtime`, etc.).

For questions, see the main `DEPLOYMENT_MANIFEST` or operational readiness docs.