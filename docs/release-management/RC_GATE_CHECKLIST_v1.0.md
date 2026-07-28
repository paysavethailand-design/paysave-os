# PAYSAVE OS — Release Candidate Gate Checklist v1.0

- **Gate owner:** Principal Release Manager
- **Final authority:** CTO
- **Status:** Pending CTO Approval
- **Outcome:** RC APPROVED / HOLD / REJECTED

## 1. Candidate Identity

- [ ] Proposed version uses `X.Y.Z-rc.N`.
- [ ] Source revision and immutable release tag recorded.
- [ ] Artifact URI and SHA-256 digest recorded.
- [ ] Dependency-lock digest and SBOM recorded.
- [ ] Migration/seed manifest and digest recorded (`none` if absent).
- [ ] Candidate was produced by project-owned CI from a clean checkout.
- [ ] Same artifact is deployed to production-like Staging; no environment rebuild.

## 2. Feature Gate

- [ ] Beta exit criteria passed.
- [ ] Scope is frozen and matches Product-approved release notes.
- [ ] Every critical capability maps to acceptance criteria and test/UAT evidence.
- [ ] No incomplete capability is presented as supported.
- [ ] Deferred/HTTP 501 paths are excluded or safely disabled and documented.
- [ ] No feature, API/event contract, dependency, configuration contract, migration, or seed changed after candidate build.
- [ ] Compatibility classification and SemVer increment are approved.

## 3. Quality Gate

- [ ] Clean dependency installation from lockfile passes.
- [ ] Architecture check passes.
- [ ] Full test suite passes.
- [ ] Typecheck passes.
- [ ] Lint passes.
- [ ] Formatting check passes.
- [ ] Production build passes.
- [ ] Critical end-to-end scenarios pass in production-like Staging.
- [ ] Upgrade/migration rehearsal passes where applicable.
- [ ] Required tests have no unexplained skip, quarantine, or flakiness.
- [ ] No open Sev-1 or Sev-2 defect.
- [ ] Remaining lower-severity defects have owner, workaround, target, and accepted disposition.
- [ ] Independent read-only review has no unresolved Critical/High finding.

## 4. Security Gate

- [ ] Secret scan passes and no credential exists in source, logs, docs, artifact, or evidence.
- [ ] Dependency audit has no untriaged exploitable Critical/High vulnerability.
- [ ] SAST, DAST, and runtime configuration review pass as applicable.
- [ ] Staging Auth/JWT/session and refresh/revocation behavior pass.
- [ ] RBAC permission matrix passes.
- [ ] RLS and cross-tenant denial tests pass for all in-scope domains.
- [ ] Privilege escalation, IDOR, and sensitive-export controls pass.
- [ ] Audit event, actor, tenant, correlation ID, and sensitive-read evidence pass.
- [ ] Production secret manager, least privilege, MFA, and break-glass controls are ready.
- [ ] Security/Privacy Owner signs the artifact-specific review.

## 5. Performance and Reliability Gate

- [ ] Representative data volume, workload, and top-tenant skew are documented.
- [ ] Applicable PB1–PB5 database contribution budgets pass.
- [ ] Approved application/API service thresholds pass.
- [ ] Load and soak tests complete without progressive degradation.
- [ ] Error rate, latency, throughput, queue/backlog, connection pool, and saturation are acceptable.
- [ ] Capacity is below 80%, or an approved scale/archive action is complete.
- [ ] Failure, timeout, retry, rate-limit, and dependency-degradation behavior are verified.
- [ ] Monitoring dashboards and actionable alerts are tested against expected symptoms.

## 6. Database, Backup, and Recovery Gate

- [ ] All included migrations/seeds are approved and immutable.
- [ ] Disposable clean-install and prior-supported-version upgrade tests pass.
- [ ] RLS, FK, integrity, idempotency, encryption, and reconciliation checks pass.
- [ ] Previous application version compatibility window is documented.
- [ ] PITR configuration can meet RPO ≤ 5 minutes.
- [ ] Protected daily/monthly restore-point policy is evidenced.
- [ ] Restore drill proves DR-A service recovery within RTO ≤ 4 hours.
- [ ] Application rollback and database rollback/forward-fix rehearsal pass.
- [ ] Object-store/metadata consistency is validated when in scope.
- [ ] No unresolved database Final-Gate blocker affects the release.

## 7. Documentation and Operational Gate

- [ ] Final draft release notes and known issues are accurate.
- [ ] OpenAPI/API/event/import/export contracts are validated.
- [ ] Environment and configuration requirements are complete.
- [ ] Deployment manifest/mechanism is owned, versioned, and rehearsed.
- [ ] Go-live Runbook identifies exact steps, owners, evidence, and stop conditions.
- [ ] Rollback Runbook identifies triggers, decision authority, known-good artifact, and data strategy.
- [ ] Monitoring links, alert thresholds, on-call roster, and escalation contacts are ready.
- [ ] Support brief, user communication, and incident templates are ready.
- [ ] Change ticket and Production window are proposed.

## 8. UAT Gate

- [ ] UAT was executed against this exact artifact/digest.
- [ ] All critical business workflows passed.
- [ ] Business Owner signed the UAT result.
- [ ] No UAT blocker or undocumented workaround remains.
- [ ] Support and Operations passed operational acceptance/rehearsal.

## 9. Candidate Freeze and Bake

- [ ] Candidate freeze timestamp recorded.
- [ ] RC observation period is at least seven consecutive calendar days in production-like Staging.
- [ ] No Sev-1/Sev-2 incident occurred during the bake.
- [ ] No unexplained security, performance, data-integrity, or resource trend occurred.
- [ ] Any candidate change produced a new `-rc.N` and restarted applicable evidence/bake.

## 10. Non-Waivable RC Blockers

Any checked item below forces HOLD/REJECTED:

- [ ] Open Sev-1/Sev-2 defect
- [ ] Cross-tenant leak, authorization bypass, or critical sensitive-data exposure
- [ ] Exploitable Critical/High vulnerability
- [ ] Missing immutable artifact identity or provenance
- [ ] Failed required CI/test/security/performance/migration/restore/rollback gate
- [ ] Unknown data-loss/corruption path
- [ ] Unapproved code/database/migration/architecture change
- [ ] Missing production-like Staging or project-owned deployment mechanism
- [ ] Unavailable monitoring/on-call/rollback capability

For gate approval, every blocker box must remain unchecked.

## 11. Sign-off Record

| Approver                  | Decision | Evidence reference | Timestamp |
| ------------------------- | -------- | ------------------ | --------- |
| Engineering Lead          |          |                    |           |
| QA Lead                   |          |                    |           |
| Security/Privacy Owner    |          |                    |           |
| Database Owner            |          |                    |           |
| Platform/Operations Owner |          |                    |           |
| Product/Business Owner    |          |                    |           |
| Support Lead              |          |                    |           |
| Independent Reviewer      |          |                    |           |
| Principal Release Manager |          |                    |           |
| CTO                       |          |                    |           |

**RC version:**  
**Artifact digest:**  
**Gate decision:** RC APPROVED / HOLD / REJECTED  
**Reason/conditions:**

## 12. Current PAYSAVE Assessment (2026-07-22)

**Result: NOT ELIGIBLE FOR RC.**

Known missing evidence includes project-owned CI/deployment manifest, live production-like Staging Auth/RBAC/RLS/tenant-isolation tests, migration runtime evidence, representative performance/soak tests, backup/restore and rollback drills. Database Final-Gate blockers also remain. Local code-gate success does not override these failures.
