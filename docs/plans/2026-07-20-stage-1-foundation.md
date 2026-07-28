# PAYSAVE OS Stage 1 Foundation Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task after explicit approval.

**Goal:** Establish enforceable project boundaries and tooling before adding PAYSAVE business modules.

**Architecture:** TypeScript monorepo using a modular monolith. Next.js App Router is the delivery/composition layer; each feature follows domain, application, infrastructure and presentation boundaries. PostgreSQL migrations and Supabase adapters remain separately governed.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui, Supabase, PostgreSQL, Vitest, ESLint, Prettier.

---

## Approval gate

This plan intentionally stops before Business Logic, new database DDL, API integrations or production deployment.

### Task 1: Confirm module map and ownership

**Objective:** Approve the initial feature names, owners and cross-feature contracts.

**Files:**

- Review: `docs/architecture/FEATURE_STRUCTURE.md`
- Create after approval: `docs/architecture/MODULE_CATALOG.md`

**Verification:** Every module has one owner, clear scope and no overlapping responsibility.

### Task 2: Enforce dependency boundaries

**Objective:** Add automated checks preventing domain/framework imports and feature deep imports.

**Files:**

- Create after approval: `scripts/validate-boundaries.mjs`
- Modify after approval: `package.json`
- Test: `scripts/validate-boundaries.test.mjs`

**Verification:** A fixture with forbidden import fails; current tree passes.

### Task 3: Activate reserved shared packages only when needed

**Objective:** Turn approved reserved boundaries into versioned workspace packages.

**Files:**

- Review: `docs/architecture/SHARED_PACKAGES.md`
- Create only approved package: `packages/<name>/package.json`, `tsconfig.json`, `src/index.ts`

**Verification:** Package has explicit `exports`, no deep import and independent typecheck.

### Task 4: Finalize environment contract

**Objective:** Validate public/server environment variables without exposing secrets.

**Files:**

- Modify: `apps/web/src/shared/config/env.ts`
- Modify: `apps/web/.env.example`
- Test: `apps/web/src/shared/config/env.test.ts`

**Verification:** Missing required variables fail early; Client bundle cannot import server schema.

### Task 5: Approve first business module

**Objective:** Select one module and write its blueprint before code.

**Files:**

- Create: `docs/architecture/modules/<module>.md`
- Create only if database scope is approved: separate Database Blueprint/ERD/DDL draft

**Verification:** Inputs, outputs, roles, tenant scope, events, PII and audit requirements are signed off.

### Task 6: Implement the first vertical slice with TDD

**Objective:** Build the smallest approved capability end-to-end.

**Sequence:** failing policy test → domain/application implementation → adapter integration test → server authorization → UI/accessibility test → build/audit.

**Verification commands:**

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --omit=dev --audit-level=moderate
```
