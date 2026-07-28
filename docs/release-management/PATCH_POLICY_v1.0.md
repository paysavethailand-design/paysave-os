# PAYSAVE OS — Patch Policy v1.0

- **Owner:** Principal Release Manager
- **Status:** Pending CTO Approval
- **Applies to:** Planned backward-compatible Production maintenance releases

## 1. Definition

A patch is a planned, low-risk, backward-compatible correction to a supported Production minor line. It increments `PATCH` and follows the normal RC and Production gates at a scope proportionate to risk, without waiving mandatory controls.

## 2. Allowed Patch Content

- Defect fixes preserving supported behavior
- Security remediation preserving supported contracts
- Reliability/performance improvement without intentional behavior break
- Backward-compatible dependency update
- Operational/observability correction without architecture change
- Documentation/runbook correction accompanying the release artifact

## 3. Prohibited Patch Content

- New business capability or material workflow expansion
- Breaking API/event/import/export/auth contract
- Intentional removal of supported behavior
- Broad refactor unrelated to the correction
- Destructive/incompatible database migration
- Architecture change hidden as maintenance
- Multiple unrelated high-risk changes bundled to avoid a MINOR release

If classification is ambiguous, use MINOR or obtain CTO/Architecture decision.

## 4. Version and Branch Rules

- Increment PATCH: `1.4.2` → `1.4.3`.
- Pre-release candidate: `1.4.3-rc.1`.
- Base from the supported Production line and record merge-forward to active development.
- Never move an existing release tag or overwrite an artifact.
- Workspace, lockfile, release note, tag, and artifact versions must agree under the lockstep policy.

## 5. Planned Patch Cadence

- Standard patch window: weekly Wednesday 21:00–23:00 ICT, only when an approved candidate exists.
- Patch may be deferred to the next window if evidence is incomplete.
- Business/finance blackout periods override the standard window.
- An urgent qualifying incident uses Hotfix Policy, not an unreviewed early patch.

## 6. Patch Workflow

1. Triage issue and confirm patch eligibility.
2. Assign target supported line and PATCH version.
3. Freeze scope and document compatibility/risk.
4. Implement with independent review.
5. Run targeted tests and full mandatory repository quality chain.
6. Run security/dependency/secret checks.
7. Validate in production-like Staging with exact artifact.
8. Run affected critical E2E/UAT scenario and adjacent regression.
9. Rehearse deployment and rollback; validate database compatibility if applicable.
10. Complete RC Gate and required bake period according to risk.
11. Complete Production Readiness and GO/NO-GO.
12. Deploy in approved patch window and monitor through hypercare.
13. Merge forward and close release evidence.

## 7. Risk Classification

| Patch risk | Example                                                                                          | Minimum treatment                                                        |
| ---------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Low        | Localized UI/text/logic correction with no data/auth contract effect                             | Full repository gates, targeted E2E, staging smoke, rollback             |
| Medium     | Shared logic, dependency, API-compatible behavior, query/performance change                      | Full regression, security/performance impact tests, RC observation       |
| High       | Auth/RBAC/RLS, tenant scope, financial write, migration, encryption, audit, critical integration | Treat with full RC/Production gates; consider MINOR or Hotfix governance |

Risk classification never permits skipping non-waivable tenant, security, data-integrity, provenance, or rollback controls.

## 8. Database in a Patch

A database change is eligible for PATCH only when all are true:

- Backward compatible with current and previous supported application versions
- Approved under existing database governance
- Rehearsed for clean install and upgrade
- Integrity/RLS/FK/idempotency checks pass
- Rollback or forward-fix is proven
- No destructive or architecture-changing effect

Otherwise classify as MINOR/MAJOR and follow the required architecture/database process. This policy does not authorize migration creation.

## 9. Patch Evidence

- Issue/risk and scope
- Target/current versions and source revisions
- Compatibility analysis
- Test/security/performance evidence
- Staging artifact/digest
- Database manifest and validation, if any
- UAT/business acceptance for affected workflow
- Go-live/rollback records
- Approvals, deployment outcome, hypercare, and merge-forward proof

## 10. Patch Support

- The newest patch in a supported minor line supersedes older patches.
- Older patches receive the transition/security treatment defined in Support Lifecycle.
- A patch with a critical defect may be yanked without deleting its audit record.

## 11. Completion Criteria

- Corrected behavior passes and adjacent supported behavior remains intact.
- No unresolved release blocker.
- Exact artifact promoted and monitored.
- Release notes and support guidance published.
- Fix merged forward.
- Evidence package and retrospective actions closed.
