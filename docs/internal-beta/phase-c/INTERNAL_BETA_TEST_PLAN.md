# PAYSAVE OS — Stage 4.0 Phase C Internal Beta Test Plan

- Environment: Supabase Staging `paysave-staging` (`rptqfhtanjtrxtfbgrkb`) only
- Production: PROHIBITED
- State: PREPARED / NOT OPENED — CTO Review required
- Test data: synthetic only

## Purpose and boundaries

Validate internal-beta readiness without architecture, database schema, migration, JWT design, RLS, permission, grant, or Production changes. Missing evidence is a failed gate. A local pass does not prove managed Staging readiness.

## Entry criteria

- [ ] CTO clears Phase B JWT blocker (`permission_denied`)
- [ ] Approved Staging application runtime and immutable artifact identity
- [ ] Staging tester accounts and synthetic tenant/cases
- [ ] Dependency-aware `/readyz` passes
- [ ] Central logs/metrics/alerts and test receiver operate
- [ ] Managed backup/restore and application rollback evidence exists
- [ ] No Sev-1/Sev-2 blockers

## Test scenarios

| ID    | Scenario      | Expected result                                                  | Evidence                         | Current status                                                  |
| ----- | ------------- | ---------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------- |
| IB-01 | Login         | Valid tester enters correct tenant; invalid/disabled user denied | auth log + correlation ID        | BLOCKED: JWT hook returns 503 permission_denied                 |
| IB-02 | Dashboard     | Real Staging data, role-scoped totals, no cross-tenant data      | screenshot + API trace           | BLOCKED: persona dashboard/static preview; runtime not deployed |
| IB-03 | Receive Case  | Synthetic case created once and auditable                        | API response + DB/audit readback | UNVERIFIED live                                                 |
| IB-04 | Assign Case   | Authorized assignment persists and appears in timeline           | before/after + audit             | PARTIAL code; UI uses mock                                      |
| IB-05 | Update Status | Allowed transition succeeds; invalid transition denied           | API + history                    | BLOCKED: lifecycle transitions return 501                       |
| IB-06 | Upload Photo  | Valid image stored privately, scanned, linked and authorized     | object metadata + attachment row | MISSING implementation                                          |
| IB-07 | Timeline      | Append-only, ordered, correlated and tenant-scoped               | API + DB readback                | PARTIAL code; live auth blocked                                 |
| IB-08 | Approval      | Authorized decision persists with reason/evidence; SoD enforced  | request/decision/audit           | BLOCKED: UI mock; live E2E unverified                           |
| IB-09 | Close Case    | Atomic close, history, timeline and outbox commit together       | transaction evidence             | BLOCKED: explicit HTTP 501 contract                             |
| IB-10 | Reports       | Role/tenant/date filters correct; export reconciles              | report + source counts           | MISSING page/API                                                |

## Non-functional scenarios

- API: availability, 4xx/5xx rate, p50/p95/p99 latency and timeout behavior.
- Security: authentication denial, permission denial, tenant isolation, redaction.
- Logging: audit/error/activity logs, correlation propagation and request trace.
- Resilience: provider backup evidence, isolated restore, immutable application/config rollback.
- Performance: CPU, memory, DB connections, saturation and queue age under a defined synthetic load.

## Daily test cycle

1. Confirm target Project Ref and non-Production runtime.
2. Record release/version/digest and tester role.
3. Check `/healthz`, dependency-aware `/readyz`, `/version`, `/metrics` and alert receiver.
4. Review overnight errors, queue age, DB connections, backup freshness and known issues.
5. Execute only scenarios marked authorized and unblocked.
6. File bugs with correlation ID, timestamp, role, tenant, expected/actual and evidence.
7. Reconcile created synthetic records and clean up only through approved product flows.
8. Publish Daily Test Report; stop on security/data/audit/monitoring failure.

## Stop conditions

Stop immediately for Production routing, cross-tenant exposure, RLS/permission anomaly, missing audit trail, data corruption, secret leakage, uncontrolled duplicate effect, unavailable monitoring, or any instruction requiring prohibited DB/JWT/RLS/grant change.
