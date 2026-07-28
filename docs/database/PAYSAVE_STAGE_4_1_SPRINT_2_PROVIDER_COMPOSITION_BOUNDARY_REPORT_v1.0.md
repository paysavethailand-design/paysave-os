# PAYSAVE OS — Stage 4.1 Sprint 2 Provider Composition Boundary Report v1.0

- **Date:** 2026-07-24
- **Scope:** architecture-only database-provider composition remediation
- **Safety:** no deploy, no Production access/change, no schema/migration change, no API/Frontend/Business Logic change
- **Identity strategy:** retain Supabase Auth and existing SSR/JWT/session behavior

## Executive result

| Control                                                          | Result                                                                                    |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `IDatabaseProvider`                                              | **IMPLEMENTED**                                                                           |
| Central `RepositoryRegistry`                                     | **IMPLEMENTED** for 8 current Supabase data adapters                                      |
| Recovery transaction/UoW registry                                | **IMPLEMENTED** using the existing direct-PostgreSQL atomic adapter                       |
| Feature `server.ts` direct construction of Supabase repositories | **REMOVED**                                                                               |
| Supabase Auth composition                                        | **UNCHANGED / retained intentionally**                                                    |
| Architecture guard                                               | **PASS** — fails closed on concrete Supabase repository imports from feature server roots |
| External PostgreSQL readiness while retaining Supabase Auth      | **80%**                                                                                   |
| Complete Supabase exit readiness                                 | **50%**                                                                                   |
| Safe to migrate now                                              | **NO** — PostgreSQL adapter parity and managed-provider rehearsal remain blockers         |

## Implemented boundary

Primary files:

- `apps/web/src/shared/providers/database/contracts.ts`
  - `IDatabaseProvider`
  - `RepositoryRegistry`
  - `UnitOfWorkRegistry`
  - `RoleRepositories`
- `apps/web/src/shared/providers/database/server.ts`
  - process-stable provider selection point
  - lazy request-scoped repository factories
  - lazy Recovery workflow transaction adapter factory
- `apps/web/src/shared/providers/database/database-provider.test.ts`
  - proves provider identity is stable
  - proves module import does not require/open a database connection
- `scripts/check-architecture.mjs`
  - `database-provider-composition-boundary`
- `scripts/check-architecture.test.mjs`
  - failing-first fixture proving the new rule rejects direct concrete Supabase repository imports

Feature server composition roots now depend on the provider boundary:

- `features/assets/server.ts`
- `features/customers/server.ts`
- `features/partners/server.ts`
- `features/permissions/server.ts`
- `features/recovery-core/server.ts`
- `features/roles/server.ts`
- `features/users/server.ts`

The `auth/server.ts` entrypoint remains Supabase-specific by design because this sprint decouples the **database plane**, not the identity plane.

## Runtime behavior preservation

- Current repository implementations remain the same eight Supabase/PostgREST adapters.
- Each repository factory remains lazy and request-scoped, preserving cookie/JWT/RLS propagation through `createAuthServerClient()`.
- Customer/User encryption-key loading remains lazy and occurs only for those repositories.
- Roles and role-permission repositories continue sharing one request-scoped Supabase client.
- Recovery lifecycle commands continue using `PgWorkflowRuntimeRepository`, which owns `BEGIN`, transaction-local `request.jwt.claims`, `COMMIT`, `ROLLBACK`, and client release.
- The provider singleton does not construct the PostgreSQL adapter until the Recovery lifecycle command path requests it; this prevents startup/import failures when `DATABASE_URL` is absent on unrelated paths.

## Readiness score

### External PostgreSQL while retaining Supabase Auth: **80/100**

| Dimension                         |  Weight |  Score | Evidence                                                                                                        |
| --------------------------------- | ------: | -----: | --------------------------------------------------------------------------------------------------------------- |
| Business/Application isolation    |      20 |     19 | Domain/Application remain behind repository ports                                                               |
| Repository abstraction coverage   |      20 |     15 | Ports exist; PostgreSQL parity still missing for eight adapters                                                 |
| Provider selection/composition    |      15 |     15 | One server-only `IDatabaseProvider` and registry now own construction                                           |
| Transaction/UoW readiness         |      15 |      9 | Recovery path is atomic/direct-PG and registered centrally; system-wide multi-repository UoW remains incomplete |
| PostgreSQL schema portability     |      20 |     17 | Existing PostgreSQL-native migration/RLS baseline unchanged                                                     |
| Migration verification/operations |      10 |      5 | No external managed-provider copy/cutover/restore rehearsal yet                                                 |
| **Total**                         | **100** | **80** | **Architecture boundary ready; migration execution still blocked**                                              |

### Complete exit from Supabase: **50/100**

Database composition improved, but Supabase Auth, SSR cookies/session refresh, callback flow, custom-claims Edge Function, Auth configuration, and readiness/env contracts remain provider-specific. These are intentionally out of scope for this sprint.

## Remaining blockers

1. Implement PostgreSQL adapters for Asset, Customer, Partner, Permission, Role, RolePermission, User, and RecoveryCore ports.
2. Add provider selection/config validation only when a second complete adapter set exists; do not expose a non-functional switch.
3. Prove parity tests for each Supabase/PostgreSQL adapter pair.
4. Rehearse schema replay, synthetic data copy, row/hash reconciliation, RLS/JWT parity, performance, backup/restore, cutover, and rollback on the selected managed PostgreSQL target.
5. Make `/readyz` dependency probes provider-aware.
6. Complete M001–M016 follow-on coverage from 114/161 logical-root tables under the existing schema governance process.
7. Design a separate `IdentityProvider`/`SessionProvider` boundary only if CTO authorizes full Supabase exit.

## Verification record

Final measured quality gates:

- Provider boundary test: **1/1 PASS**
- Recovery PostgreSQL transaction tests: **2/2 PASS**
- Architecture checker tests: **11/11 PASS**
- Operations tests: **36/36 PASS**
- Workspace tests: **306/306 PASS**
- Aggregate automated tests: **353/353 PASS**
- Architecture scan: **PASS**
- Typecheck: **PASS** across all workspaces
- Format check: **PASS**
- Production build: **PASS**
- Dependency audit: **0 vulnerabilities**
- Lint: **0 errors**; **10 pre-existing warnings** in `recovery-management/infrastructure/runtime/staging-recovery-repository.ts`

Independent checker review identified that the first rule revision depended on `importPath.includes("repository")` and could be bypassed by renaming an adapter. The test was strengthened with a non-repository data-source path, the failure was reproduced, and the rule was hardened to reject every direct `infrastructure/supabase` import from non-Auth feature `server.ts` roots while explicitly retaining the approved Auth exception. Final checker tests and the real-tree scan both pass.
