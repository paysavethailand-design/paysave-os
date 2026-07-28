# PAYSAVE OS — Release Checklist v1.0

- **Owner:** Principal Release Manager
- **Status:** Pending CTO Approval
- **Use:** Every planned Alpha, Beta, RC, and Production release

## Instructions

- Record `PASS`, `FAIL`, `N/A`, evidence link, owner, and timestamp for every item.
- `N/A` requires Release Manager approval and rationale.
- Missing evidence is `FAIL`, not `N/A`.
- RC and Production cannot proceed with a mandatory `FAIL`.

## A. Release Identity and Scope

- [ ] Release ID and target SemVer assigned.
- [ ] Milestone identified: Alpha / Beta / RC / Production.
- [ ] Source revision and immutable tag identified.
- [ ] Artifact URI and cryptographic digest recorded.
- [ ] Dependency lock digest and SBOM recorded for RC/Production.
- [ ] In-scope features, excluded capabilities, HTTP 501/deferred paths, and known issues listed.
- [ ] Change inventory covers application, configuration contract, dependencies, API/events, migrations/seeds, and documentation.
- [ ] SemVer classification reviewed against Versioning Policy.
- [ ] No unapproved code, database, migration, or architecture change is included.

## B. Build and Quality

- [ ] Clean install from approved lockfile succeeds.
- [ ] `npm run architecture:check` passes.
- [ ] `npm test` passes.
- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run format:check` passes.
- [ ] `npm run build` passes.
- [ ] Required integration/E2E tests pass in the target environment.
- [ ] No required test is skipped, quarantined, or flaky without approved disposition.
- [ ] Artifact under test matches the artifact proposed for promotion.

## C. Defect and Risk Control

- [ ] No open Sev-1 defect.
- [ ] No open Sev-2 defect for Beta exit, RC, or Production.
- [ ] Every remaining Sev-3/Sev-4 defect has owner, workaround, target release, and accepted disposition.
- [ ] Release risk assessment completed: blast radius, data risk, tenant risk, financial risk, operational risk.
- [ ] Exception/waiver register is complete and contains no non-waivable blocker.
- [ ] Independent review completed for RC/Production.

## D. Security and Privacy

- [ ] Secret scan passes; no Production secret appears in source, logs, docs, artifacts, or chat.
- [ ] Dependency audit has no untriaged Critical/High finding.
- [ ] SAST/DAST/configuration scan evidence is attached as applicable.
- [ ] Auth/JWT/session behavior validated in production-like Staging.
- [ ] RBAC, RLS, cross-tenant denial, and privilege-escalation tests pass.
- [ ] Audit events and correlation IDs are verified for critical operations.
- [ ] Production least privilege, MFA, break-glass, and secret rotation readiness confirmed.
- [ ] Data classification, masking, retention, legal hold, and privacy handling reviewed.
- [ ] Security incident contacts and escalation paths are current.

## E. Database and Data Safety

- [ ] Exact migration and seed manifest recorded; `none` stated explicitly if absent.
- [ ] Migration files are approved and immutable.
- [ ] Clean-install and upgrade rehearsal pass in disposable/Staging PostgreSQL.
- [ ] FK, RLS, integrity, idempotency, and tenant-isolation checks pass.
- [ ] Backward compatibility with previous supported application version is documented.
- [ ] Backup/PITR recovery point exists before Production change.
- [ ] Rollback or approved forward-fix path is rehearsed.
- [ ] Restore drill evidence meets applicable RPO/RTO before Production Ready.
- [ ] Data reconciliation queries/checks and expected results are documented.
- [ ] No unresolved Database Final-Gate blocker affects release scope.

## F. Performance, Capacity, and Reliability

- [ ] Workload model and representative data volume are documented.
- [ ] Applicable PB1–PB5 performance budgets pass in production-like Staging.
- [ ] Soak/load test passes for RC/Production.
- [ ] Capacity, connection pool, queue/backlog, error rate, and tenant-skew evidence reviewed.
- [ ] No resource is at/above 80% without approved scale/archive action.
- [ ] Timeouts, retry limits, rate controls, and failure behavior are verified.
- [ ] Production dashboards and alerts are tested.

## G. Contracts and Documentation

- [ ] Release notes are complete and match actual scope.
- [ ] OpenAPI/API/event/import/export contracts are current and validated.
- [ ] Environment variable documentation is current; secrets are not embedded.
- [ ] User/admin/operator behavior changes are documented.
- [ ] Known issues and workarounds are published to authorized audiences.
- [ ] Go-live and Rollback Runbooks are versioned and linked.
- [ ] Support playbook, escalation matrix, and communication templates are ready.
- [ ] Migration, deployment, monitoring, and recovery evidence links are accessible to approvers.

## H. UAT and Business Approval

- [ ] UAT plan identifies critical business workflows and expected results.
- [ ] UAT uses the exact candidate artifact in the approved environment.
- [ ] Business Owner signs critical scenarios PASS.
- [ ] No open UAT blocker remains.
- [ ] Operational acceptance is completed by Support and Operations.
- [ ] Business timing avoids prohibited/blackout periods or has explicit exception approval.

## I. Deployment and Rollback Readiness

- [ ] Project-owned deployment mechanism exists and is rehearsed.
- [ ] Change ticket and implementation window approved.
- [ ] Named Deployment Lead, Validator, Incident Commander, Database Owner, Security contact, and Communications Lead are assigned.
- [ ] Pre-deployment backup/recovery point procedure is verified.
- [ ] Step-by-step deployment and non-destructive smoke tests are ready.
- [ ] Rollback triggers are quantitative and observable.
- [ ] Previous known-good artifact and configuration are available.
- [ ] Database rollback/forward-fix limitations are explicit.
- [ ] On-call and hypercare coverage is confirmed.

## J. Gate Decision

| Sign-off                  | Name/Role | Decision | Evidence/Comment | Timestamp |
| ------------------------- | --------- | -------- | ---------------- | --------- |
| Engineering Lead          |           |          |                  |           |
| QA Lead                   |           |          |                  |           |
| Security Owner            |           |          |                  |           |
| Platform/Operations Owner |           |          |                  |           |
| Database Owner            |           |          |                  |           |
| Product/Business Owner    |           |          |                  |           |
| Support Lead              |           |          |                  |           |
| Independent Reviewer      |           |          |                  |           |
| Principal Release Manager |           |          |                  |           |
| CTO / Change Authority    |           |          |                  |           |

**Final decision:** GO / CONDITIONAL GO / HOLD / NO-GO / ROLLBACK  
**Artifact digest:**  
**Decision timestamp:**  
**Conditions or reason:**
