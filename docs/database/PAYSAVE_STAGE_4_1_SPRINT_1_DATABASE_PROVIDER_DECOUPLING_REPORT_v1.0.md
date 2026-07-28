# PAYSAVE OS — Stage 4.1 Sprint 1 Database Provider Decoupling Report v1.0

- **Authorization:** CTO Authorized
- **Review date:** 2026-07-24
- **Scope:** source-code and repository evidence only
- **Safety:** no deploy, no Production access/change, no schema change, no migration change
- **Objective:** assess and strengthen the boundary required to move PAYSAVE OS from Supabase Database to another PostgreSQL provider without changing Business Logic, Frontend, or API contracts

## Executive decision

| Decision                                          | Result                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| Business/Domain direct Supabase dependency        | **PASS** — none found                                          |
| Repository interfaces                             | **IMPLEMENTED for current database-backed feature set**        |
| Provider selection boundary (`IDatabaseProvider`) | **MISSING**                                                    |
| Generic `UnitOfWork` / `Transaction` boundary     | **PARTIAL** — implemented only for Recovery lifecycle commands |
| Database move while retaining Supabase Auth       | **68% ready**                                                  |
| Complete exit from all Supabase services          | **46% ready**                                                  |
| Current vendor lock-in                            | **MEDIUM-HIGH**                                                |
| Safe to perform database migration now            | **NO — readiness work remains**                                |

The architecture has a strong starting point: Domain/Application code is isolated behind repository ports, and a real PostgreSQL transaction adapter already proves direct `pg` access and request-scoped RLS claim propagation. However, server composition roots still instantiate Supabase adapters directly, there is no single provider-selection contract, most repositories have no PostgreSQL implementation, and Auth/session/claims issuance remains tightly coupled to Supabase.

## Evidence and method

Primary evidence:

- `apps/web/src/features/**/application/ports/*-repository.ts`
- `apps/web/src/features/**/infrastructure/supabase/*-repository.ts`
- `apps/web/src/features/**/server.ts`
- `apps/web/src/features/recovery-core/infrastructure/postgres/pg-workflow-runtime-repository.ts`
- `apps/web/src/features/auth/**`
- `apps/web/src/app/readyz/dependencies.ts`
- `supabase/functions/paysave-claims-hook/**`
- `database/migrations/**`
- `database/README.md`
- `scripts/check-architecture.mjs`

Mechanical scan results (production source, excluding tests):

- Supabase SDK imports: **12 files**
- Supabase-backed repository implementations: **8**
- Application repository interfaces: **11**
- Auth SDK operations: **6 call sites across 5 files**
- Storage client operations: **0**
- Realtime client operations: **0**
- Supabase client RPC calls: **0**
- Edge Functions: **1** (`paysave-claims-hook`)
- RLS enable statements in current migration tree: **91** across **15 files**
- `CREATE POLICY` statements: **276** across **14 files**
- PostgreSQL extensions: `pgcrypto`, `citext`, `pg_trgm`
- Supabase-only database role reference: `supabase_auth_admin` in frozen legacy migration only

`database/README.md:20-24` states that legacy `0001_*`/`0002_*` drafts must not be used as the current implementation, M001-M016 implement **114 of 161** logical-root tables, and local PostgreSQL 17 replay verification exists.

---

# Deliverable 1 — Supabase Dependency Matrix

| Area                          | Current evidence                                                                                                                                                |             Runtime dependency | Classification                            | Lock-in                         | Replacement path                                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----------------------------: | ----------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Database / PostgREST          | Eight Supabase repository adapters; e.g. `customers/.../supabase-customer-repository.ts:24-99`, `recovery-core/.../supabase-recovery-core-repository.ts:55-350` |                            Yes | **Critical + Replaceable**                | High today                      | Implement PostgreSQL adapters for existing repository ports and select provider in one composition root                            |
| Supabase client creation      | `auth/infrastructure/supabase/server-client.ts:1-28`, `browser-client.ts:1-7`                                                                                   |                            Yes | **Critical + Replaceable**                | High                            | Separate data client from identity/session client; data repositories must not receive a Supabase Auth client                       |
| Auth / SSR session            | `sign-in-actions.ts:26-38`, `get-auth-context.ts:5-14`, `update-session.ts:26-53`, `app/auth/callback/route.ts:9-12`                                            |                            Yes | **Critical**                              | High                            | Retain Supabase Auth during DB migration, then introduce `IdentityProvider`/`SessionProvider` boundary if full exit is approved    |
| Custom claims Edge Function   | `supabase/functions/paysave-claims-hook/index.ts:1-40`                                                                                                          | Yes for current claim issuance | **Critical + Replaceable**                | Medium-High                     | Keep provider-neutral resolver and `ClaimSource`; replace Deno/Supabase shell with app service, worker, or another IdP hook        |
| Claim business resolver       | `paysave-claims-hook/resolver.ts:29-41,98-145`                                                                                                                  |  No direct provider dependency | **Replaceable seam already present**      | Low                             | Reuse unchanged with a PostgreSQL `ClaimSource` adapter                                                                            |
| Storage                       | No `.storage` or `storage.from` call found; only `/readyz` probe at `app/readyz/dependencies.ts:15-19`                                                          |        No current product path | **Optional**                              | Low                             | Remove from readiness until an upload workflow exists, or move future objects to S3-compatible storage                             |
| Realtime                      | No channel/subscription call found                                                                                                                              |                             No | **Optional / Unused**                     | None                            | Keep disabled; use polling, queue, SSE, or another broker only when a proven workflow requires it                                  |
| Client RPC                    | No `.rpc()` call found                                                                                                                                          |                             No | **Optional / Unused**                     | None                            | Keep business transactions behind repository/UoW ports; use PostgreSQL functions internally only when needed                       |
| PostgreSQL functions/triggers | 17 function declarations across migrations                                                                                                                      |     Yes, but PostgreSQL-native | **Critical + Portable**                   | Low across PostgreSQL providers | Replay unchanged or with small extension/role compatibility adjustments                                                            |
| RLS/JWT context               | `M003_iam.sql:300-361`; `request.jwt.claims`, `admin.authorized_partner`                                                                                        |                            Yes | **Critical + Portable with gateway work** | Medium                          | External app gateway sets transaction-local claims exactly as `pg-workflow-runtime-repository.ts:364-410` already demonstrates     |
| Readiness checks              | `app/readyz/dependencies.ts:15-60` hardcodes Supabase REST/Auth/Storage endpoints                                                                               |       Yes for readiness result | **Replaceable**                           | Medium                          | Introduce provider-specific readiness adapter and probe only enabled dependencies                                                  |
| Environment contract          | `shared/config/env.ts:3-40` requires Supabase URL/key                                                                                                           |                            Yes | **Critical + Replaceable**                | Medium                          | Split identity config from database config; support `DATABASE_PROVIDER` + `DATABASE_URL` while retaining Auth config independently |
| Supabase local config         | `supabase/config.toml:1-7` defines project and claims hook                                                                                                      |       Yes for Supabase tooling | **Optional after migration**              | Low                             | Retain only while Supabase Auth/Edge remains active                                                                                |

## Direct query inventory by production adapter

| Repository port             | Current adapter                    | Composition root                         |
| --------------------------- | ---------------------------------- | ---------------------------------------- |
| `AssetRepository`           | `SupabaseAssetRepository`          | `features/assets/server.ts:18-20`        |
| `CustomerRepository`        | `SupabaseCustomerRepository`       | `features/customers/server.ts:18-21`     |
| `PartnerRepository`         | `SupabasePartnerRepository`        | `features/partners/server.ts:16-18`      |
| `PermissionRepository`      | `SupabasePermissionRepository`     | `features/permissions/server.ts:14-16`   |
| `RoleRepository`            | `SupabaseRoleRepository`           | `features/roles/server.ts:22-29`         |
| `RolePermissionRepository`  | `SupabaseRolePermissionRepository` | `features/roles/server.ts:22-29`         |
| `UserRepository`            | `SupabaseUserRepository`           | `features/users/server.ts:17-20`         |
| `RecoveryCoreRepository`    | `SupabaseRecoveryCoreRepository`   | `features/recovery-core/server.ts:29-31` |
| `WorkflowRuntimeRepository` | `PgWorkflowRuntimeRepository`      | `features/recovery-core/server.ts:78-88` |

---

# Deliverable 2 — Provider Abstraction Report

## Boundary status

| Boundary                                | Status                                            | Evidence / impact                                                                                     |
| --------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Domain → provider SDK                   | **PASS**                                          | No Supabase imports found in Domain                                                                   |
| Application → provider SDK              | **PASS**                                          | No actual Supabase SDK/import dependency found in Application                                         |
| Application → repository ports          | **PASS for implemented database-backed features** | 11 repository interfaces under `application/ports`                                                    |
| Infrastructure adapters implement ports | **PASS**                                          | Eight Supabase adapters and one PostgreSQL transaction adapter use `implements ...Repository`         |
| Route Handlers call feature public APIs | **PASS**                                          | Existing architecture checker enforces route/feature boundaries                                       |
| One database provider selection point   | **MISSING**                                       | Feature `server.ts` files instantiate `Supabase*Repository` directly                                  |
| `IDatabaseProvider`                     | **MISSING**                                       | No symbol exists                                                                                      |
| Generic `UnitOfWork`                    | **MISSING**                                       | No shared contract exists                                                                             |
| Generic transaction abstraction         | **PARTIAL**                                       | Recovery `WorkflowRuntimeRepository` is explicitly transactional; no system-wide transaction contract |
| Auth provider abstraction               | **MISSING**                                       | Presentation/server guards import concrete Supabase infrastructure                                    |

## Guardrail added in this sprint

The architecture checker now rejects direct `@supabase/*` SDK imports from Domain and Application layers:

- rule: `provider-sdk-boundary`
- implementation: `scripts/check-architecture.mjs`
- failing-first test: `scripts/check-architecture.test.mjs`

This does not change Business Logic, Frontend, API contracts, schema, or migrations.

## Minimum future provider contracts

The following contracts should be introduced in an approved implementation sprint; they are not silently added as unused abstractions in this report:

```ts
interface IDatabaseProvider {
  readonly kind: "supabase-postgrest" | "postgresql";
  readonly repositories: RepositoryRegistry;
  readonly unitOfWork: UnitOfWork;
}

interface UnitOfWork {
  transaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T>;
}

interface Transaction {
  query<Row>(statement: SqlStatement): Promise<readonly Row[]>;
}
```

Required design rules:

1. Application services continue to depend only on existing repository interfaces.
2. Provider selection occurs once in a server-only composition root.
3. Supabase Auth/session remains a separate identity concern and must not be used as the database-provider interface.
4. Every PostgreSQL transaction must set trusted request claims transaction-locally before running RLS-bound SQL.
5. Unsupported transaction behavior must fail closed; never emulate atomic multi-write operations with sequential PostgREST calls.
6. No provider-specific type may cross into Domain, Application DTOs, Frontend, or API response contracts.

---

# Deliverable 3 — Database Migration Readiness Report

## Readiness score: **68%** for external PostgreSQL while retaining Supabase Auth

| Dimension                               |  Weight |  Score | Reason                                                                                                                     |
| --------------------------------------- | ------: | -----: | -------------------------------------------------------------------------------------------------------------------------- |
| Business/Application isolation          |      20 |     19 | Core business code uses repository ports; no Supabase SDK in Domain/Application                                            |
| Repository abstraction coverage         |      20 |     15 | Required ports exist, but current compositions are concrete Supabase adapters                                              |
| Provider selection/composition          |      15 |      5 | No `IDatabaseProvider` or central provider factory                                                                         |
| Transaction/UoW readiness               |      15 |      7 | Real `pg` transaction adapter exists only for Recovery lifecycle commands                                                  |
| PostgreSQL schema/migration portability |      20 |     17 | Raw PostgreSQL 17 SQL, common extensions, RLS, local replay; 114/161 current migration coverage                            |
| Migration verification/operations       |      10 |      5 | Local verification exists; no external-provider rehearsal, data-copy proof, cutover, rollback, or measured managed restore |
| **Total**                               | **100** | **68** | **Not migration-ready yet**                                                                                                |

## Target compatibility

| Target                          | Compatibility                         | Main caveats                                                                                                         |
| ------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Vanilla PostgreSQL 17           | High                                  | Install `pgcrypto`, `citext`, `pg_trgm`; create runtime/migration roles; set RLS claim GUC per transaction           |
| AWS RDS for PostgreSQL          | High                                  | Validate extension availability, connection pooling, IAM/secret integration, PITR/restore, network policy            |
| Azure Database for PostgreSQL   | High                                  | Validate extensions, role privileges, pool/proxy strategy, backup/restore and monitoring                             |
| Google Cloud SQL for PostgreSQL | High                                  | Validate extensions, Cloud SQL connector/pooling, backup/PITR, private connectivity                                  |
| Self-hosted PostgreSQL          | Technically high, operationally lower | Patching, HA, backup, PITR, monitoring, TLS, secrets, failover and on-call ownership become PAYSAVE responsibilities |

## Portable database features

- PostgreSQL schemas, UUID, JSONB, RLS, policies, PL/pgSQL, triggers and partitioning are PostgreSQL-native.
- Current migration scan found no `storage.*`, Realtime publication, `pg_net`, `pg_cron`, or Vault dependency.
- Extensions are common PostgreSQL extensions, not exclusive Supabase APIs.
- `PgWorkflowRuntimeRepository` proves a direct `DATABASE_URL` path, `BEGIN/COMMIT/ROLLBACK`, and transaction-local `request.jwt.claims` propagation (`:60-80,364-410`).

## Migration blockers

1. **No central provider switch:** eight server composition paths directly construct Supabase adapters.
2. **Missing PostgreSQL adapters:** only the Recovery transactional command path has a direct PostgreSQL adapter.
3. **Auth/data coupling:** repository construction currently receives the request-scoped Supabase client carrying JWT/RLS context.
4. **No generic UoW:** multi-repository transactions cannot be expressed provider-neutrally.
5. **Partial migration baseline:** M001-M016 cover 114/161 logical-root tables; this is a schema-program status risk independent of provider portability.
6. **No external-provider rehearsal:** no verified schema replay, synthetic data copy, row/count/hash reconciliation, RLS parity, performance baseline, backup/restore or rollback drill on RDS/Azure/Cloud SQL/self-host.
7. **Readiness hardcoding:** `/readyz` assumes Supabase Database/Auth/Storage are all mandatory.

---

# Deliverable 4 — Vendor Lock-in Assessment

## Overall risk: **MEDIUM-HIGH**

| Component                  | Risk        | Why                                                                                                              |
| -------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Business rules/domain      | Low         | Provider SDK does not enter Domain/Application                                                                   |
| Database schema            | Low-Medium  | Mostly portable PostgreSQL; RLS gateway convention and extension/role checks required                            |
| Repository implementations | High        | Eight implementations use Supabase JS/PostgREST query semantics                                                  |
| Transaction semantics      | Medium-High | PostgREST paths are single-statement; only one bounded direct-PG transaction adapter exists                      |
| Auth/session/cookies       | High        | Supabase SSR client, callback, sign-in/out, JWT claims and middleware are concrete                               |
| Claims issuance            | Medium-High | Provider-neutral resolver exists, but deployed shell is Supabase Edge/Deno + service role + webhook contract     |
| Storage                    | Low today   | No runtime client path exists; planned architecture mentions private object storage but implementation is absent |
| Realtime                   | None today  | No client use found                                                                                              |
| RPC                        | Low today   | No client RPC use; database functions are PostgreSQL-native internal mechanisms                                  |
| Operations/readiness       | Medium      | Health checks and environment contract hardcode Supabase endpoints/config                                        |

A Database-only migration should **retain Supabase Auth first**. Attempting Database, Auth, Storage and Edge replacement in one cutover would unnecessarily combine identity, session, RLS and persistence risks.

---

# Deliverable 5 — Cost Optimization Plan

## Immediate, no product-behavior change

1. **Do not pay for unused Realtime capacity/features:** no runtime subscription path exists.
2. **Do not treat Storage as a mandatory app dependency yet:** no upload/download client path exists; remove or feature-flag the readiness probe only in an approved implementation sprint.
3. **Keep one claims Edge Function:** it is the only current function and is security-critical; optimize after measuring invocation volume, not by removing it blindly.
4. **Control database growth:** enforce retention/archive policy for event, timeline, audit and history tables; measure indexes and table bloat before tier upgrades.
5. **Use connection pooling deliberately:** direct `pg` currently limits the Recovery pool to five connections; size by measured concurrency per provider.

## Recommended cost path

### Option A — Lowest migration risk

- External PostgreSQL for application data
- Supabase Auth retained
- Claims hook retained initially
- Object storage selected separately only when document upload is implemented
- Realtime disabled/not enabled

### Option B — Lowest platform dependence

- External PostgreSQL
- Independent OIDC provider/session layer
- S3-compatible object storage
- Claims service hosted in app/worker runtime
- No Supabase Data API, Edge or Realtime

Option B has higher engineering and security-migration cost and should follow a stable Database-only migration.

## Cost decision inputs required

Before selecting a provider, compare the same measured workload:

- database size and monthly growth
- peak/average connections
- read/write IOPS and query latency
- backup retention and PITR cost
- outbound data transfer
- high availability requirement
- storage object volume/egress
- Auth MAU and claims-hook invocation count
- operational staffing cost for self-hosting

Do not select self-hosted PostgreSQL solely from compute price; include patching, HA, backup, restore, monitoring, incident response and security ownership.

---

# Deliverable 6 — Recommended Future Architecture

```text
Next.js Route Handler / Server Action
        |
        v
Application Service (unchanged)
        |
        v
Repository Port (existing)
        |
        v
Server-only IDatabaseProvider composition root
        |------------------------------|
        v                              v
Supabase/PostgREST adapters      PostgreSQL adapters
(current transition path)       (target data path)
                                       |
                                       v
                              UnitOfWork / Transaction
                                       |
                                       v
                       PostgreSQL RLS claim context per tx

IdentityProvider / SessionProvider (separate boundary)
        |
        +--> Supabase Auth initially
        +--> another OIDC provider later, if approved
```

## Roadmap

### Phase 0 — Completed in this sprint

- Complete dependency inventory and classification.
- Confirm no Domain/Application Supabase SDK dependency.
- Add fail-closed architecture rule `provider-sdk-boundary`.
- Establish readiness score and blocker ledger.

### Phase 1 — Provider composition boundary

- Define approved `IDatabaseProvider`, `RepositoryRegistry`, `UnitOfWork`, and `Transaction` contracts.
- Move concrete adapter selection from eight feature `server.ts` files to one server-only provider composition root.
- Keep current Supabase adapters as the default implementation.
- Add contract tests proving both provider implementations satisfy repository behavior.

**Exit:** switching provider does not change Application, Frontend or API code.

### Phase 2 — PostgreSQL adapter parity

Implement PostgreSQL adapters in this order:

1. read-only list/detail paths
2. single-table writes
3. encrypted customer/user mappings
4. role/permission relations
5. Recovery core multi-table paths through UoW

Add tenant, permission, pagination, optimistic-concurrency, encryption and audit parity tests for every port.

**Exit:** all repository contract tests pass for Supabase and PostgreSQL adapters.

### Phase 3 — External PostgreSQL rehearsal

- Replay approved migrations in an isolated target.
- Validate extensions and runtime/migration role privileges.
- Copy synthetic/staging data only.
- Reconcile counts, constraints, hashes, sequences, RLS decisions and query plans.
- Run backup/PITR/restore and rollback rehearsal.
- Compare latency, throughput, connection use and cost.

**Exit:** provider evidence is measured, not target-only.

### Phase 4 — Database cutover while retaining Supabase Auth

- Freeze writes for the approved window or use an approved replication/change-capture design.
- Final delta copy and reconciliation.
- Switch the server-only provider selector.
- Keep Supabase Auth/session and claims issuance unchanged.
- Monitor and retain rollback window.

### Phase 5 — Optional Supabase service exit

Only after database stability:

- add `IdentityProvider` and `SessionProvider` ports
- migrate Auth and session/cookie behavior
- replace claims-hook host while reusing provider-neutral resolver
- select S3-compatible object storage if document workflows require it
- retire Supabase readiness/config/tooling paths

---

# Exit Criteria Verdict

- **Database provider decoupling:** **PARTIAL**
- **Ready to move database today:** **NO**
- **Readiness to external PostgreSQL while retaining Supabase Auth:** **68%**
- **Readiness for complete Supabase exit:** **46%**
- **Recommended next sprint:** Phase 1 Provider Composition Boundary, followed by PostgreSQL repository contract adapters

## Explicitly unchanged

- Business Logic: unchanged
- Frontend: unchanged
- API contracts: unchanged
- Database schema: unchanged
- Migration files: unchanged
- Production: not accessed or changed
- Deployment: not performed
