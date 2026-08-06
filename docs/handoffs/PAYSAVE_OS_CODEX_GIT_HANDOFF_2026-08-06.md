# PAYSAVE OS — Git Handoff for Codex

**Handoff date:** 2026-08-06
**Repository:** `paysavethailand-design/paysave-os`
**Local working tree:** `/tmp/paysave-single-login`
**Remote:** `git@github.com:paysavethailand-design/paysave-os.git`
**Branch:** `fix/single-login-flow`
**Implementation commit:** `956a03f4c74d111f4f8f907efc694ea7d2fe8937`
**Implementation commit message:** `fix(auth): grant tenant admin all module access`
**Baseline before admin-access work:** `b87b0335784f6b88d96414559f22924060037266`

## 1. Repository state at handoff

- Admin-access implementation commit: `956a03f4c74d111f4f8f907efc694ea7d2fe8937`.
- The final Git handoff commit is the tip of `origin/fix/single-login-flow` containing this document.
- The implementation commit is pushed to `origin` and must be an ancestor of the handoff tip.
- Do not switch to `main` or any Production branch for this task.

Before making any change, Codex must verify:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/fix/single-login-flow
git merge-base --is-ancestor 956a03f4c74d111f4f8f907efc694ea7d2fe8937 HEAD
```

Expected:

- worktree is clean;
- local `HEAD` equals `origin/fix/single-login-flow`;
- the ancestry check exits `0`.

If the worktree is dirty, local/remote differ, or the ancestry check fails, stop and inspect the drift before editing.

## 2. Completed implementation

The commit aligns tenant-admin access across dashboard routes, navigation, page guards, claims tests, and managed-staging role permissions.

### Dashboard persona policy

The canonical persona policy is in:

```text
apps/web/src/features/frontend-dashboard/domain/dashboard.ts
```

Policy:

- `admin` dashboard: `admin`, `super_admin`
- `executive` dashboard: `admin`, `super_admin`
- `partner` dashboard: original `partner` owner plus `admin`, `super_admin`
- `field` dashboard: original `supervisor`/`agent` owners plus `admin`, `super_admin`
- `supervisor` dashboard: original supervisor owner plus `admin`, `super_admin`
- `personal` dashboard: original agent owner plus `admin`, `super_admin`

Do not expand the cross-persona access of `partner`, `supervisor`, or `agent`.

### Authenticated navigation context

Roles and permissions from the authenticated server session are propagated through:

```text
apps/web/src/app/dashboard/[persona]/page.tsx
apps/web/src/features/frontend-dashboard/composition.tsx
apps/web/src/features/frontend-dashboard/presentation/dashboard-view.tsx
apps/web/src/features/frontend-dashboard/presentation/dashboard-shell.tsx
apps/web/src/app/inventory/layout.tsx
apps/web/src/app/recovery/layout.tsx
```

Menu gates use exact permissions:

- Inventory: `assets.read`
- Recovery Cases: `cases.read`
- Recovery Assignments: `assignments.read`

Recovery case detail has an explicit `cases.read` page gate:

```text
apps/web/src/app/recovery/cases/[caseId]/page.tsx
```

### Claims contract

Admin permission construction for the active tenant is regression-tested in:

```text
supabase/functions/paysave-claims-hook/resolver.test.ts
```

The active tenant continues to come from `activePartnerId`. Do not weaken:

```text
packages/security/src/auth-context.ts
packages/security/src/tenant-scope.ts
packages/security/tests/tenant-scope.test.ts
```

Cross-tenant mismatch must continue to fail closed with `partner_mismatch`.

## 3. Managed Staging admin migration

**Target only:**

- Project: `paysave-staging`
- Project ref: `rptqfhtanjtrxtfbgrkb`
- Tenant: `RC_STAGING`
- Role: `admin`

Authoritative committed migration:

```text
database/migrations/managed_staging/20260805_admin_active_tenant_access.sql
```

Migration SHA-256:

```text
3c6a2c68ad41d2e8bc7dccd884d2525eaa69c0591943fb6355140c764e3bf427
```

Immutable source URL:

```text
https://raw.githubusercontent.com/paysavethailand-design/paysave-os/956a03f4c74d111f4f8f907efc694ea7d2fe8937/database/migrations/managed_staging/20260805_admin_active_tenant_access.sql
```

### Exact approved Allow set: 19 permissions

```text
assets.read
assets.manage
cases.read
cases.manage
assignments.read
assignments.manage
partners.read
partners.manage
customers.read
customers.manage
reports.read
payments.read
commission.read
users.read
users.manage
roles.read
roles.manage
permissions.read
permissions.manage
```

Explicitly not granted:

```text
platform.manage
```

Safety behavior:

- exactly one active `RC_STAGING` tenant must exist;
- exactly one active `admin` role in that tenant must exist;
- all 19 permission catalog rows must already exist;
- no Permission row is created;
- an explicit deny on a required permission aborts the transaction;
- required Allow count must be 19;
- total Allow count must also be exactly 19;
- any stale/excess Allow, including `platform.manage`, causes fail-closed rollback;
- no other tenant is targeted;
- roles `partner`, `supervisor`, and `agent` are not targeted;
- RLS is not disabled;
- no `service_role` bypass is introduced;
- no encryption or schema-wide changes are included.

Verification files:

```text
database/tests/managed_staging_admin_access_verify.sql
database/tests/managed_staging_admin_access_verify.sh
```

Verification command:

```bash
npm run verify:managed-staging-admin-access
```

Expected markers:

```text
MANAGED_STAGING_ADMIN_ACCESS_PASS
MANAGED_STAGING_ADMIN_EXCESS_GRANT_REJECTED
```

### External state

The admin-access migration has **not** been applied to Managed Staging at this handoff. It must not be applied to Production.

Preflight, Apply, and Readback SQL were handed to the owner as three separate SQL sets. Any apply must be explicitly bound to project ref `rptqfhtanjtrxtfbgrkb`, followed by readback evidence.

## 4. Preview deployment

GitHub/Vercel deployment metadata:

- GitHub deployment ID: `5761022968`
- Environment: `Preview`
- State: `success`
- Bound commit/ref: `956a03f4c74d111f4f8f907efc694ea7d2fe8937`
- Immutable environment URL: `https://paysave-os-em3l9dr48-paysave-v1.vercel.app`
- Vercel dashboard record: `https://vercel.com/paysave-v1/paysave-os-web/GoomxRrYXtHq9yC2evZ76YEATC3i`

Deployment Protection remains enabled. Unauthenticated requests to `/version` and protected application routes return a Vercel `302` before reaching application runtime. This is `ACCESS_BLOCKED_NOT_APP_VERDICT`, not evidence of application success or failure.

Control-plane commit binding is verified. Runtime `/version` readback and authenticated application acceptance are still not verified.

Do not disable Vercel Deployment Protection to complete testing.

## 5. Verification evidence completed

Verified before commit/push:

- targeted dashboard, shell, composition, Recovery detail, Inventory action, and asset-update tests: PASS;
- full `npm test`: PASS;
- claims-hook tests: PASS;
- `npm run typecheck`: PASS;
- `npm run lint`: PASS;
- `npm run build`: PASS;
- `npm run architecture:check`: PASS;
- dependency-audit repository policy: PASS;
- `npm run verify:managed-staging-admin-access`: PASS;
- `npm run verify:managed-staging-inventory-rls`: PASS;
- `npm run verify:database`: PASS;
- `git diff --check`: PASS.

Recorded test counts from the final verification run:

- Web: 160 files / 492 tests
- Claims Hook: 3 files / 20 tests
- Infrastructure: 56 tests
- Security: 24 tests
- Observability: 8 tests
- Testing package: 2 tests
- UI: 9 tests

Independent reviews:

- application authorization review: PASS;
- database/security review: initial Medium for stale/excess Allow detection;
- fix: total Allow count must equal 19, plus `platform.manage` negative fixture;
- independent re-review of that finding: PASS;
- independent cross-tenant review: PASS.

## 6. Files changed by commit 956a03f

```text
.gitignore
apps/web/src/app/dashboard/[persona]/page.test.tsx
apps/web/src/app/dashboard/[persona]/page.tsx
apps/web/src/app/inventory/layout.tsx
apps/web/src/app/recovery/cases/[caseId]/page.test.tsx
apps/web/src/app/recovery/cases/[caseId]/page.tsx
apps/web/src/app/recovery/layout.tsx
apps/web/src/features/frontend-dashboard/composition.test.tsx
apps/web/src/features/frontend-dashboard/composition.tsx
apps/web/src/features/frontend-dashboard/domain/dashboard.test.ts
apps/web/src/features/frontend-dashboard/domain/dashboard.ts
apps/web/src/features/frontend-dashboard/presentation/dashboard-shell.test.tsx
apps/web/src/features/frontend-dashboard/presentation/dashboard-shell.tsx
apps/web/src/features/frontend-dashboard/presentation/dashboard-view.tsx
database/migrations/managed_staging/20260805_admin_active_tenant_access.sql
database/tests/managed_staging_admin_access_verify.sh
database/tests/managed_staging_admin_access_verify.sql
package.json
packages/security/src/security-review-architecture-evidence.json
supabase/functions/paysave-claims-hook/resolver.test.ts
```

Diff from baseline `b87b033` to `956a03f`:

```text
20 files changed, 590 insertions(+), 31 deletions(-)
```

## 7. Remaining work

Do not call the feature Live-PASS until all remaining gates are complete.

1. Run Preflight SQL on Managed Staging project ref `rptqfhtanjtrxtfbgrkb`.
2. Retain the complete Preflight output.
3. Apply the reviewed migration only if Preflight passes.
4. Run Readback SQL and retain evidence showing exactly 19 total Allows.
5. Confirm `platform.manage` is absent.
6. Sign out/sign in, or otherwise issue a fresh admin session/JWT.
7. Use an already authorized session on the immutable Preview host.
8. Verify `/version` reports source revision `956a03f4c74d111f4f8f907efc694ea7d2fe8937`.
9. Perform authenticated acceptance for all six dashboards and all module menus/routes.
10. Exercise permission-gated child APIs/server actions, including Inventory Save.
11. Verify a cross-tenant request is denied while same-tenant access succeeds.
12. Confirm no unexpected `/unauthorized`, application `403`, or redirect loop.
13. Preserve Vercel Deployment Protection.
14. Do not deploy or mutate Production.

## 8. Required acceptance matrix

Record `PASS`, `FAIL`, or `BLOCKED` with actual URLs/statuses and no secrets.

| Surface                    | Expected admin result                                                         |
| -------------------------- | ----------------------------------------------------------------------------- |
| `/dashboard/admin`         | allowed                                                                       |
| `/dashboard/executive`     | allowed                                                                       |
| `/dashboard/partner`       | allowed                                                                       |
| `/dashboard/field`         | allowed                                                                       |
| `/dashboard/supervisor`    | allowed                                                                       |
| `/dashboard/personal`      | allowed                                                                       |
| `/inventory`               | allowed with `assets.read`; save governed by existing managed-staging RPC/RLS |
| `/recovery/cases`          | allowed with `cases.read`                                                     |
| `/recovery/cases/[caseId]` | allowed with `cases.read`                                                     |
| `/recovery/assignments`    | allowed with `assignments.read`                                               |
| Partner/business modules   | allowed only through the approved permission set                              |
| Cross-tenant access        | denied                                                                        |

Regression requirements:

- `super_admin` retains its existing full scope;
- `partner`, `supervisor`, and `agent` retain their existing boundaries;
- `activePartnerId`, RLS, and cross-tenant denial remain unchanged.

## 9. Hard constraints for Codex

- Preview and Managed Staging only.
- Never touch Production.
- Never run `supabase db push`, `migration up`, or `db reset` against an unverified managed target.
- Never infer permission codes; read canonical source/constants and catalog migrations.
- Never create a Permission to make a test pass.
- Never grant `platform.manage` to tenant admin.
- Never disable RLS or Vercel Deployment Protection.
- Never use `service_role` as an authorization bypass.
- Never change Encryption Key configuration.
- Do not recreate users or alter IAM roles when the remaining requirement is only session/JWT refresh.
- Stop at password, OAuth consent, MFA, passkey, secret, or account-choice prompts and request the human action.
- Keep source/test PASS separate from Managed Staging and Live acceptance PASS.

## 10. Codex starting brief

Use the following as the initial Codex instruction:

```text
Continue PAYSAVE OS from repository /tmp/paysave-single-login on branch
fix/single-login-flow at the current clean branch tip containing this handoff.
The admin-access implementation commit
956a03f4c74d111f4f8f907efc694ea7d2fe8937 must be an ancestor of HEAD.

First verify the worktree is clean, local HEAD equals
origin/fix/single-login-flow, and the implementation commit is in HEAD history.

Current implementation for tenant admin all-module access is committed,
pushed, independently reviewed, and deployed to a protected Preview.
Managed Staging target is paysave-staging / rptqfhtanjtrxtfbgrkb,
tenant RC_STAGING, role admin. The migration has not been applied.

Preserve exact 19 admin Allows, reject stale/excess Allows such as
platform.manage, preserve partner/supervisor/agent and super_admin behavior,
preserve activePartnerId/RLS/cross-tenant denial, and never touch Production.

Do not claim Live PASS until Managed Staging preflight/apply/readback,
fresh JWT/session, immutable /version commit readback, authenticated route/API
acceptance, Inventory Save, and cross-tenant denial have all been verified.
```

## 11. Current overall status

| Gate                                                 | Status                   |
| ---------------------------------------------------- | ------------------------ |
| Source implementation                                | PASS                     |
| Automated tests/build/security/database verification | PASS                     |
| Independent review                                   | PASS                     |
| Commit and push                                      | PASS                     |
| Preview control-plane deployment                     | PASS                     |
| Managed Staging admin permission readback            | PASS - exactly 19 Allows |
| Authenticated admin all-pages acceptance             | PASS                     |
| Partner dashboard                                    | PASS                     |
| Field dashboard                                      | PASS                     |
| Recovery Cases                                       | PASS                     |
| Recovery Assignments                                 | PASS                     |
| Inventory                                            | PASS                     |
| Reports                                              | PASS                     |
| Payments                                             | PASS                     |
| Commission                                           | PASS                     |
| Unexpected application `403`                         | NONE OBSERVED            |
| Production touched                                   | NO                       |

## 12. Live Acceptance update

This section supersedes the incomplete acceptance state recorded in sections 3, 4, 7, and 10. Those sections are retained as historical context from the earlier handoff.

**Acceptance source branch:** `codex/fix-missing-admin-permissions`

**Acceptance commit:** `3f86a008919806bb47ce7ce02b784abc1ba50bbe`

**Target branch for review:** `fix/single-login-flow`

The accepted source includes:

- tenant-admin access to every supported Dashboard persona;
- admin access to the Partner and Field dashboards;
- explicit route-level permission guards for Reports, Payments, and Commission;
- the idempotent, fail-closed missing Permission Catalog migration for `reports.read`, `payments.read`, and `commission.read`;
- database and route-level regression tests for permission catalog safety, exact admin access, explicit-only permission matching, and tenant isolation.

Owner-reported Live Acceptance results:

| Surface                                | Result                   |
| -------------------------------------- | ------------------------ |
| All Dashboard personas                 | PASS                     |
| Partner dashboard                      | PASS                     |
| Field dashboard                        | PASS                     |
| Recovery Cases                         | PASS                     |
| Recovery Assignments                   | PASS                     |
| Inventory                              | PASS                     |
| Reports                                | PASS                     |
| Payments                               | PASS                     |
| Commission                             | PASS                     |
| Unexpected application `403`           | NONE OBSERVED            |
| Managed Staging `RC_STAGING` / `admin` | PASS - exactly 19 Allows |
| Production                             | NOT TOUCHED              |

The Live Acceptance result does not authorize a Production deployment, additional migration apply, RLS changes, permission expansion, or a merge to `main`. The reviewed Pull Request must target only `fix/single-login-flow` and must not be merged automatically.
