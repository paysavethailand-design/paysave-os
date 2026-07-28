# PAYSAVE OS — Release Strategy v1.0

- **Document owner:** Principal Release Manager
- **Approval authority:** CTO
- **Version:** 1.0
- **Status:** Pending CTO Approval
- **Effective date:** Upon CTO approval
- **Timezone:** Asia/Bangkok (ICT, UTC+7)
- **Scope:** Release governance and operational process only
- **Prohibited by this document:** Code, database, migration, or architecture changes

## 1. Purpose

This strategy defines how PAYSAVE OS moves through Alpha, Beta, Release Candidate (RC), and Production while preserving tenant isolation, financial and personal-data controls, auditability, rollback safety, and the frozen architecture.

A release is evidence-driven. Completion of coding, a passing local build, or a version label alone is never sufficient to promote a release.

## 2. Current Baseline Decision

As of 2026-07-22, the repository reports product version `0.1.0` and has working local quality commands, but it does not contain a project-owned CI workflow or deployment manifest. Existing project evidence also states that live Staging authentication, JWT/RBAC/RLS integration, migration execution, performance testing, backup/restore, and rollback drills have not been completed. Migration Batch #6 remains CTO-blocked and M017–M020 do not exist.

Therefore:

- **Current classification:** development baseline / Alpha-entry candidate only
- **Release Candidate:** **NO**
- **Production Ready:** **NO**
- The value `0.1.0` is not proof of a released production version.

This strategy does not authorize deployment or resolve any existing architecture/database blocker.

## 3. Release Principles

1. **Promote the same immutable artifact.** Build once after the release commit is approved; promote the identified artifact through Staging and Production. Never rebuild from an unverified source state for Production.
2. **Evidence before label.** A milestone label is granted only after its gate evidence is stored and approved.
3. **Fail closed.** Missing, stale, ambiguous, or environment-mismatched evidence fails the gate.
4. **No direct Production-first release.** Every Production artifact must have passed RC in a production-like Staging environment.
5. **Tenant and data safety are release blockers.** Cross-tenant access, RLS bypass, unauthorized privilege, data-loss risk, or unverified sensitive-data handling blocks promotion.
6. **Database safety is independent.** Code-gate success is not evidence that migrations, restore, or rollback are safe.
7. **No silent exceptions.** A waiver must identify the risk, owner, expiry, compensating control, and approving authority. No waiver may permit a known Sev-1/Sev-2 defect, cross-tenant leak, critical vulnerability, untested destructive database change, or unavailable rollback path.
8. **Separation of duties.** The implementer cannot be the sole approver for RC or Production.
9. **Observable and reversible.** Go-live requires health signals, decision thresholds, and a rehearsed rollback path.
10. **Traceability.** Release version, source revision, artifact digest, dependencies, migration set, test evidence, approvals, deployment record, and incident/rollback record must be linked.

## 4. Environments and Promotion Path

| Environment | Purpose                                                              | Data                                 | Promotion authority                          |
| ----------- | -------------------------------------------------------------------- | ------------------------------------ | -------------------------------------------- |
| Local/Test  | Fast development and deterministic tests                             | Synthetic/disposable only            | Engineering                                  |
| Alpha       | Internal integration and incomplete feature validation               | Synthetic; isolated                  | Engineering Lead + QA Lead                   |
| Beta        | Feature-complete business validation in production-like Staging      | Synthetic or approved masked dataset | Product Owner + QA + Security                |
| RC          | Immutable production-intent artifact and final operational rehearsal | Production-like Staging only         | Release Manager chairs; CTO grants RC        |
| Production  | Approved customer/business operation                                 | Governed Production data             | CTO or delegated Production Change Authority |

Promotion is one-way by evidence. A failed gate returns the release to the prior milestone or creates a new candidate version; evidence is never edited to make a failed artifact pass.

## 5. Release Roles and Accountability

| Role                              | Accountability                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| CTO / Production Change Authority | Final approval for RC and Production; accepts only permitted residual risk                                           |
| Principal Release Manager         | Owns calendar, gate meeting, evidence index, release decision log, go/no-go, and closure                             |
| Engineering Lead                  | Confirms scope, implementation review, reproducible build, known limitations, and rollback compatibility             |
| QA Lead                           | Owns test strategy, regression evidence, defect classification, UAT coordination, and exit recommendation            |
| Security Owner                    | Approves vulnerability, secrets, authentication, authorization, RLS, audit, privacy, and incident-readiness evidence |
| Platform/Operations Owner         | Owns environment readiness, deployment, observability, capacity, backup, restore, rollback, and on-call readiness    |
| Database Owner                    | Owns migration manifest, forward/rollback safety, backup point, restore evidence, and data validation                |
| Product/Business Owner            | Approves feature scope, acceptance criteria, UAT result, release notes, and business timing                          |
| Support Lead                      | Confirms support brief, known-issue playbook, escalation routes, user communication, and hypercare staffing          |
| Independent Reviewer              | Confirms gate evidence and exceptions without implementing the release change                                        |

## 6. Milestone Gates

### 6.1 Alpha

**Purpose:** Integrate incomplete capabilities safely and expose design/contract defects early. Alpha is not customer-ready.

#### Feature Criteria

- Alpha scope and excluded capabilities are documented.
- Implemented capabilities have acceptance criteria and traceability to tests.
- Stubs, mocks, disabled paths, and HTTP 501 gaps are listed explicitly.
- No claim of feature completeness is allowed.

#### Quality Criteria

- Repository installation succeeds from the approved lockfile.
- `npm run architecture:check`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format:check`, and `npm run build` pass from a clean workspace.
- New/changed behavior has deterministic unit or integration coverage appropriate to its layer.
- No open Sev-1 defect; Sev-2 defects require release-manager visibility and must not affect the Alpha test objective.

#### Security Criteria

- No committed secret or Production credential.
- Authentication and permission guards exist for protected surfaces.
- Dependency and secret scans have no untriaged critical result.
- Synthetic data only; no Production personal/financial data.

#### Performance Criteria

- No obvious unbounded list, full-table request path, or uncontrolled retry loop in Alpha scope.
- Performance-risk assumptions and future benchmark needs are recorded.
- Local timing is diagnostic only and is not a production claim.

#### Documentation Criteria

- Alpha release notes identify scope, known gaps, setup, test commands, and non-production warning.
- API/contract documentation is updated for changed external behavior.
- Every deferred capability has an owner or blocking dependency.

#### UAT Criteria

- Internal engineering/QA acceptance only.
- Business walkthrough may occur, but business sign-off is not required to call the build Alpha.
- Test identities and data are synthetic and isolated.

#### Exit Criteria

- Alpha objectives completed; critical integration unknowns are documented.
- No unresolved defect prevents Beta feature-complete work.
- Product, Engineering, and QA approve promotion to Beta preparation.

### 6.2 Beta

**Purpose:** Validate feature-complete release scope in a production-like Staging environment.

#### Feature Criteria

- Planned release scope is feature complete; no new feature enters after Beta scope freeze without CTO-approved reset.
- All unsupported paths are deliberately excluded, disabled, and documented.
- API, workflow, role/permission, and data-contract compatibility are reviewed.

#### Quality Criteria

- All Alpha quality commands pass in CI from a clean checkout.
- Production-like Staging deployment succeeds through the documented mechanism.
- Critical business flows pass end-to-end; regression suite passes.
- No open Sev-1 or Sev-2 defect. Sev-3 defects require an owner, workaround, and accepted release disposition.
- Test evidence identifies artifact digest and environment.

#### Security Criteria

- Live Staging Auth/JWT/session lifecycle, RBAC, RLS, cross-tenant denial, and audit correlation are verified.
- Dependency, secret, SAST, and configuration scans have no untriaged Critical/High finding.
- Privileged-access and environment-secret controls are verified without placing secrets in evidence.
- Sensitive-data handling uses synthetic or formally approved masked data.

#### Performance Criteria

- Representative Staging workload and data volume are defined.
- Applicable frozen PB1–PB5 database budgets are measured.
- Capacity, tenant skew, connection, error-rate, and saturation observations are recorded.
- Any unmet budget blocks RC unless scope is removed or CTO approves a time-bounded non-safety exception.

#### Documentation Criteria

- Draft release notes, operator runbooks, support brief, API/OpenAPI, environment requirements, migration manifest, known issues, and rollback draft are complete.
- Documentation contains no secret or Production identifier.

#### UAT Criteria

- Business Owner executes approved UAT scenarios for all in-scope critical workflows.
- UAT defects are recorded with severity and disposition.
- UAT may be conditional during Beta but all blocking conditions must close before RC.

#### Exit Criteria

- Feature complete, Beta regression passes, UAT has no open blocker, and no Sev-1/Sev-2 defect remains.
- Staging environment is proven suitable for RC rehearsal.
- Release Manager accepts the evidence set and opens an RC candidate record.

### 6.3 Release Candidate (RC)

**Purpose:** Certify one immutable production-intent artifact. RC permits defect fixes only; any feature or contract expansion resets the candidate.

#### Feature Criteria

- Scope is frozen and matched to release notes and acceptance traceability.
- All critical workflows are complete; unsupported capabilities are excluded and cannot be accidentally invoked.
- Only blocker fixes may enter. Each fix creates the next prerelease number (`-rc.N+1`) and reruns affected and full gates.

#### Quality Criteria

- All repository quality gates pass in project-owned CI for the exact source revision.
- The exact immutable artifact is deployed to production-like Staging.
- Full regression, critical E2E, upgrade/migration rehearsal, and rollback rehearsal pass.
- No open Sev-1/Sev-2 defect; no flaky required test; no unexplained gate bypass.
- Artifact digest, dependency lock, SBOM, test evidence, and approvals are linked.

#### Security Criteria

- Security Owner signs off Auth/JWT/session, RBAC/RLS, tenant isolation, secrets, auditability, dependency/SAST/DAST results, and incident contacts.
- No known exploitable Critical or High vulnerability.
- Privileged access uses least privilege and approved MFA/break-glass controls.
- Security and privacy exception register is empty for blockers and explicit for accepted lower risks.

#### Performance Criteria

- Representative Staging tests meet applicable frozen PB budgets.
- Capacity remains below release-blocking thresholds; no resource is projected to cross 80% without approved scale/archive action.
- Error-rate, latency, throughput, queue/backlog, and database connection behavior meet approved release thresholds.
- Soak test completes for the approved duration with no unresolved leak, saturation, or progressive degradation.

#### Documentation Criteria

- Final release notes, OpenAPI/contracts, migration manifest, deployment plan, go-live runbook, rollback runbook, monitoring dashboard links, support playbook, data-handling notes, known issues, and decision log are complete.
- Document owners have approved their sections.

#### UAT Criteria

- Business Owner signs all critical UAT scenarios PASS against the RC artifact.
- No open UAT blocker or undocumented workaround.
- Support and Operations complete an operational acceptance rehearsal.

#### Exit Criteria

- RC Gate Checklist is 100% PASS or contains only CTO-approved eligible exceptions.
- CTO records the RC decision for the exact artifact digest.
- The artifact enters a minimum seven-calendar-day RC observation/bake period in production-like Staging.
- Any code, dependency, configuration, migration, or contract change creates a new RC and restarts applicable evidence and bake period.

## 7. Definition: When PAYSAVE OS Is a Release Candidate

PAYSAVE OS is a **Release Candidate** only when all conditions below are true:

1. Beta exit criteria are complete.
2. Scope is frozen and production-intent.
3. A project-owned CI pipeline has produced a reproducible immutable artifact from the approved revision.
4. Full quality, security, tenant-isolation, Auth/RBAC/RLS, migration, performance, UAT, backup/restore, and rollback evidence is attached to that artifact.
5. No Sev-1/Sev-2 defect, critical/high exploitable vulnerability, unresolved cross-tenant risk, or destructive-change uncertainty exists.
6. Go-live, rollback, monitoring, on-call, support, and communications are rehearsed.
7. RC Gate Checklist is signed by Engineering, QA, Security, Platform/Operations, Database, Product/Business, Support, Release Management, and finally CTO.
8. The exact artifact is labeled using `X.Y.Z-rc.N` and its digest is immutable.

If any condition is missing, the version may be Alpha or Beta but must not be called RC.

### 6.4 Production

**Purpose:** Operate the approved stable release for business use with support and recovery commitments.

#### Feature Criteria

- Production scope exactly matches the approved RC; no late feature, dependency, configuration, or migration change.
- Release notes and user-visible behavior match the deployed artifact.

#### Quality Criteria

- RC completed at least seven calendar days of stable production-like observation with no Sev-1/Sev-2 defect.
- Production Readiness Checklist and pre-deployment release checklist are complete.
- Go-live validation and rollback decision thresholds are approved before change-window start.

#### Security Criteria

- Final security review remains valid for the artifact and Production configuration.
- Production secrets, least privilege, MFA/break-glass, audit, retention, privacy, and incident response are operational.
- No security evidence is copied into insecure documents or chat.

#### Performance Criteria

- RC performance and soak evidence meets frozen PB/capacity targets.
- Production dashboards and alerts are active before traffic enablement.
- Capacity headroom and scaling/escalation ownership are confirmed.

#### Documentation Criteria

- All final runbooks, release notes, version/tag/digest, support matrix, known issues, owner roster, and rollback evidence are published in the controlled repository.
- Change ticket records approvals, window, implementation log, and outcome.

#### UAT Criteria

- Final Business Owner approval references the exact RC artifact.
- Production smoke validation uses approved non-destructive checks and no uncontrolled customer-data mutation.

#### Exit Criteria

- Production Readiness Checklist is complete and CTO issues GO.
- Deployment and smoke tests pass within the change window.
- Hypercare completes without unresolved Sev-1/Sev-2 incident.
- Release record is closed with actual timing, artifact digest, validation evidence, incidents, and lessons learned.

## 8. Definition: Production Ready

PAYSAVE OS is **Production Ready** only after:

- One exact RC artifact passes the RC bake period unchanged.
- Project-owned CI, immutable build, SBOM, scans, tests, Staging deployment, and artifact provenance are proven.
- Production-like Auth/JWT/session, RBAC/RLS, cross-tenant denial, audit, and data-protection controls pass.
- All approved migrations and seeds pass clean-install, upgrade, integrity, rollback/forward-fix, and live Staging tests.
- Performance meets applicable PB1–PB5 budgets and approved service-level thresholds.
- PITR/backup controls meet RPO ≤ 5 minutes and a restore/rollback drill demonstrates RTO ≤ 4 hours for DR-A service recovery.
- Observability, alerts, on-call, incident response, support, communication, and ownership are active.
- UAT, Release Checklist, Production Readiness Checklist, Go-live Runbook, and Rollback Runbook are signed.
- No release blocker remains and CTO gives explicit GO for the artifact digest.

A successful local test/build, an Alpha/Beta label, or a code-only report does not satisfy Production Ready.

## 9. Release Decision States

| State          | Meaning                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| GO             | Every mandatory gate passed; deployment may start within the approved window                              |
| CONDITIONAL GO | Allowed only for eligible lower-risk exception with owner, expiry, compensating control, and CTO approval |
| HOLD           | Evidence incomplete or temporary condition unresolved; no deployment                                      |
| NO-GO          | Mandatory gate failed or blocker exists; candidate rejected                                               |
| ROLLBACK       | Production validation/health threshold breached; execute approved rollback runbook                        |

## 10. Mandatory Blockers

The following cannot be waived for RC or Production:

- Known Sev-1/Sev-2 defect
- Cross-tenant data exposure or authorization bypass
- Critical/High exploitable vulnerability without verified remediation
- Production secret exposure
- Missing immutable artifact identity or inability to reproduce/provenance-check it
- Failed required test, security gate, migration rehearsal, restore drill, or rollback rehearsal
- Unknown data-loss/corruption path
- Missing monitoring/on-call during change window
- Capacity above 80% without approved action
- Unapproved schema, migration, architecture, or production-scope change

## 11. Required Evidence Package

Every RC/Production candidate must include:

- Release ID, SemVer, source revision, tag, artifact URI, and digest
- Approved scope and change inventory
- CI run identifiers and full gate results
- Test plan/results and defect register
- Security scan and review summary
- SBOM and dependency lock digest
- API/contract compatibility result
- Migration/seed manifest and database rehearsal evidence, when applicable
- Staging deployment, Auth/RBAC/RLS/tenant-isolation, UAT, performance, soak, backup/restore, and rollback evidence
- Go-live and rollback runbooks
- Monitoring, alert, on-call, support, and communication plan
- Approvals, waivers, and decision log
- Post-release validation and closure record

## 12. Governance Review

- Strategy review: at least annually or after a Sev-1 release incident, major platform change, regulatory change, or failed rollback.
- Checklist review: after every Production release during retrospective.
- This document does not amend frozen architecture. Any required architecture change must follow the existing ADR/CTO process independently.
