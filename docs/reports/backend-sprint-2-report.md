# Backend Sprint #2 Report — Recovery Core

**Status:** Completed — awaiting CTO Review  
**Decision baseline:** CTO Option 4  
**Completed at:** 2026-07-22 18:29:26 +07

## 1. Scope Delivered

Backend Sprint #2 implements Recovery Core only, on the approved request-scoped Supabase/PostgREST architecture.

### Recovery Case

- Create case — single-row insert
- Update case — single-row update with optimistic lock
- Case detail — tenant-scoped read
- Case search — tenant-scoped bounded cursor pagination and filters
- Close / Reopen — explicit HTTP 501 transaction-gap responses

### Assignment

- Assign agent — single-row insert
- Reassign / Accept / Reject / Complete — explicit HTTP 501 transaction-gap responses

### Workflow / Status Engine

- List available transitions from the current workflow instance state
- Validate transition action and permission without mutating state
- Execute transition — explicit HTTP 501 transaction-gap response

### Timeline

- Append one immutable event row
- List with bounded keyset pagination and filters
- Opaque compound cursor over `(occurred_at, id)` prevents event skipping when timestamps are equal
- `event_version_id` is preserved as deferred event-catalog contract data

### Field Operation

- Create field visit — single-row insert
- Check-in / Check-out — single-row optimistic-lock updates
- Append field visit result — single-row insert
- Create contact attempt — single-row insert
- Allowed channels: `phone`, `sms`, `line`, `visit`, `email`, `other`

### Promise to Pay

- Create promise — single-row insert
- Update amount / due date — single-row optimistic-lock update
- Fulfill / Broken / Cancel — explicit HTTP 501 transaction-gap responses

## 2. API and Repository Artifacts

- Feature module: `apps/web/src/features/recovery-core/`
- API routes: `apps/web/src/app/api/v1/recovery/`
- OpenAPI: `docs/api/openapi-recovery-core.yaml`
- Data-only permission catalog seed: `database/seeds/0002_backend_sprint2_recovery_permission_catalog.sql`
- Shared API error addition: `atomic_transaction_not_supported` mapped to HTTP 501
- Shared deterministic Supabase fake extended with `lt` and `or` query recording for adapter tests

The OpenAPI companion specification contains:

- 23 paths
- 26 operations
- 10 documented HTTP 501 transaction-gap operations
- Exact CTO error code and reason

## 3. Security, Tenant, Audit, and Concurrency Controls

### Authentication and RBAC

All routes use the existing request authentication and permission guard.

Permission codes:

- `cases.read`
- `cases.manage`
- `assignments.read`
- `assignments.manage`

The new seed inserts catalog rows only. It intentionally does not grant permissions to roles.

### Tenant Isolation

- Target partner is resolved by the approved `resolveWritePartnerId` policy.
- Case detail validates the loaded case tenant at the application boundary in addition to database RLS.
- Timeline reads/writes validate case ownership and partner scope.
- Repository filters include partner predicates where required.

### Audit and Correlation

Audit events are emitted for:

- Case create/update/search/read
- Timeline list/append
- Assignment and field-operation writes
- Promise-to-pay writes
- Workflow transition list/validation
- Every blocked lifecycle command as `denied`

Timeline persistence validates that `x-correlation-id` is UUID-compatible with `recovery.case_timeline_events.correlation_id`; when the header is absent, the shared wrapper generates a UUID.

### Optimistic Locking

The following updates require `expectedVersionNo`, predicate on `version_no`, and increment exactly once:

- Recovery case update
- Field visit check-in/check-out
- Promise-to-pay update

A version miss maps to HTTP 409 `conflict`.

## 4. Architecture Compliance

Verified:

- No database RPC added
- No direct PostgreSQL transaction adapter added
- No schema change
- No migration change
- No architecture change
- No forbidden multi-row write implementation
- Multi-write lifecycle routes terminate at HTTP 501 without calling repository write methods
- Data access remains request-scoped Supabase/PostgREST

## 5. Verification Evidence

### Targeted Recovery Core

- 4 test files passed
- 30 tests passed
- Includes schema unit tests, application tests, deterministic Supabase adapter integration tests, and 10 route-level HTTP 501 contract tests

### Full Repository Gates

- Architecture tests: **9/9 passed**
- Web tests: **250/250 passed** across **81 test files**
- Observability tests: **3/3 passed**
- Security tests: **19/19 passed**
- Testing package tests: **2/2 passed**
- UI tests: **9/9 passed**
- Full typecheck: **passed**
- Full lint: **passed**
- Next.js production build: **passed**; all Recovery API routes appear in the build route manifest

### OpenAPI

Offline validation passed:

- YAML parsed successfully
- Operation IDs are unique
- 23 paths / 26 operations
- 10 HTTP 501 operations
- Exact transaction-gap code/reason present
- Compound timeline cursor documented
- Timeline correlation header documented as UUID

Redocly CLI semantic lint could not run because the local Node/npm trust chain returned `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`. No TLS verification bypass was used.

### Independent Review

- Antigravity initial review found 4 items: case-detail tenant boundary, timeline UUID correlation, read/validation audit coverage, and compound timeline cursor.
- All 4 were regression-tested and fixed.
- Antigravity final read-only re-review result: **PASS**, no remaining actionable findings.
- Claude CLI review was unavailable: `Not logged in · Please run /login`. No review result was fabricated.

## 6. Integration-Test Boundary

Completed integration coverage is deterministic adapter integration against the shared Supabase query-builder fake. It verifies tenant/version predicates and compound timeline pagination behavior.

Not executed:

- Live database writes
- Staging deployment
- Permission seed application
- Live RLS integration tests

These were intentionally excluded to avoid changing or executing against the database before CTO Review.

## 7. Deployment Preconditions After CTO Approval

1. Apply the data-only permission catalog seed through the approved deployment process.
2. Grant the new permissions to approved roles through the normal IAM process.
3. Run live staging integration tests using request-scoped authenticated Supabase sessions.
4. Do not enable the 10 lifecycle commands until a separately approved atomic transaction architecture exists.

## 8. Final State

Backend Sprint #2 implementation and verification are complete within CTO Option 4. Work is stopped pending CTO Review.
