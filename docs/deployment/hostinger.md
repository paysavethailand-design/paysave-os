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

## Local Build
```bash
npm run deploy:hostinger
# or
npm run deploy
```

This:
1. Ensures `npm run build` (via the monorepo).
2. Uses the standalone output from `apps/web/.next/standalone`.
3. Flattens the nested structure so `server.js` is at the artifact root.
4. Vendors the local `@paysave/*` packages into `node_modules/@paysave/*`.
5. Patches `package.json` (removes workspaces, sets `start: "node server.js"`).
6. Verifies the artifact can start and serve requests independently.

**Output:** `deploy/hostinger/`

The directory is a complete, runnable Next.js project.

## GitHub Actions
The workflow `.github/workflows/hostinger-artifact.yml` automatically:
- Runs on push to main (relevant paths) or manual dispatch.
- Builds the monorepo + artifact.
- Uploads `hostinger-deploy-artifact-<sha>.tar.gz` as a workflow artifact.

Download the tar.gz from the Actions run → Artifacts.

## Deploying to Hostinger

### Recommended Settings (hPanel / Web Apps)
- **Framework**: Next.js
- **Root Directory**: `.` (or the root of the extracted artifact)
- **Node.js**: 22
- **Build command**: `next build` (the artifact is pre-built; you can leave the default or use a no-op if supported)
- **Output directory**: `.next`
- **Startup / Entry file**: `server.js` (or use the `start` script)

### Upload Methods
1. **ZIP upload** (easiest for one-off):
   - Zip the contents of `deploy/hostinger/` (or the whole folder).
   - Upload the ZIP in Hostinger.
   - Set Root Directory to the folder containing `server.js`.

2. **Git**:
   - Push the artifact contents to a deployment branch or separate repo if desired (not required).

3. **Actions artifact**:
   - Download the tar.gz from the workflow.
   - Extract and upload.

### Environment Variables (Hostinger)
Set the required public variables (at minimum):
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Other secrets (Supabase service role, etc.) as needed for your backend.

**Important**: The dummy values used only during local verification are not sufficient for production.

### Verification After Deploy
- The app should respond on `/`.
- `/healthz` should return 200 (liveness).
- `/readyz` will return 503 until all production readiness conditions are met (by design — fail-closed).

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