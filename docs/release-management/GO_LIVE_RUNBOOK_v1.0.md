# PAYSAVE OS — Go-live Runbook v1.0

- **Owner:** Principal Release Manager
- **Execution authority:** CTO / Production Change Authority
- **Status:** Pending CTO Approval
- **Scope:** Controlled Production release execution
- **Important:** This runbook is governance-level because no project-owned deployment manifest is currently present. Exact environment commands must be inserted, rehearsed, and approved before GO; operators must never invent commands during go-live.

## 1. Preconditions

Do not start unless:

- RC Gate and Production Readiness Checklist are approved.
- Exact stable version, source tag, artifact digest, configuration digest, and migration manifest are recorded.
- Project-owned deployment mechanism has passed Staging rehearsal.
- Change window, owners, access, backup/recovery point, monitoring, smoke tests, and rollback are ready.
- No non-waivable blocker exists.
- CTO/Change Authority gives explicit GO.

## 2. Command Roles

| Role                | Duty                                                          |
| ------------------- | ------------------------------------------------------------- |
| Change Authority    | Final GO/NO-GO and continuation authority                     |
| Release Manager     | Chairs timeline, records evidence/decisions, controls HOLD/GO |
| Deployment Lead     | Executes only approved deployment steps                       |
| Database Owner      | Executes/observes approved migration and data validation      |
| Validator/QA        | Runs smoke and critical checks independently                  |
| Incident Commander  | Takes command if threshold breached                           |
| Rollback Executor   | Executes rehearsed rollback on authorization                  |
| Security Contact    | Reviews security/auth/anomaly signals                         |
| Communications Lead | Sends approved internal/external updates                      |
| Support Lead        | Runs hypercare intake and escalation                          |

One person may hold multiple non-conflicting duties only if separation-of-duties approval is recorded. Deployment executor must not be sole validator or final approver.

## 3. Required Release Record

```text
Release ID:
Version:
Source revision/tag:
Artifact URI/digest:
Configuration digest:
SBOM/lock digest:
Migration/seed manifest:
Change ticket:
Staging evidence:
RC approval:
Production approval:
Window start/end (ICT):
Owners/contact channel:
Previous known-good version:
Rollback decision deadline:
```

## 4. Timeline

### T-7 days: RC Observation

- [ ] RC artifact remains unchanged in production-like Staging.
- [ ] Observe reliability, security, latency, error, saturation, queue, and database trends.
- [ ] Close all Sev-1/Sev-2 issues.
- [ ] Complete UAT, support training, and communications draft.
- [ ] Confirm no blackout/conflicting change.

### T-2 business days: Final Readiness Review

- [ ] Freeze release scope.
- [ ] Validate artifact provenance and all checklists.
- [ ] Confirm Production configuration diff and secret references.
- [ ] Confirm database compatibility and exact migration/seed manifest.
- [ ] Confirm backup/PITR and last restore-drill evidence.
- [ ] Reconfirm monitoring, alerts, on-call, access, and rollback artifact.
- [ ] Hold preliminary GO/NO-GO; unresolved mandatory item means HOLD.

### T-4 hours: Operational Preflight

- [ ] Verify owner attendance and dedicated communication bridge.
- [ ] Verify Production access without sharing credentials.
- [ ] Confirm no active Sev-1/Sev-2 incident and no provider degradation.
- [ ] Confirm current Production health baseline and version.
- [ ] Confirm previous known-good artifact/configuration is retrievable.
- [ ] Verify recovery point procedure and database owner readiness.
- [ ] Test alert routing and timestamp synchronization.

### T-60 minutes: Change Freeze

- [ ] Pause unrelated Production changes.
- [ ] Record current health, capacity, queue, error, latency, and database baselines.
- [ ] Create/confirm approved pre-change recovery point.
- [ ] Confirm migration lock/ownership and no competing database operation.
- [ ] Communications Lead sends approved maintenance/change-start notice if required.

### T-15 minutes: Final GO/NO-GO

Each accountable role states GO or NO-GO. Silence is not approval.

Mandatory prompts:

1. Is artifact identity exact and immutable?
2. Is current Production healthy enough to change safely?
3. Is backup/recovery point confirmed?
4. Is rollback executable within the decision window?
5. Are monitors, responders, and support active?
6. Has any scope/config/dependency changed since RC?

Any uncertainty produces HOLD.

## 5. Deployment Execution

The approved change ticket must contain exact commands/automation references. Record start/end and output reference for each step.

1. **Declare start** — Release Manager records GO, timestamp, release ID, and artifact digest.
2. **Enable change controls** — ensure only approved executor can run the release.
3. **Database pre-check** — Database Owner verifies expected current migration state and recovery point.
4. **Apply approved backward-compatible database steps** — only if present in manifest; stop on unexpected result.
5. **Deploy immutable application artifact** — use the rehearsed project-owned mechanism; no rebuild or manual file substitution.
6. **Apply approved environment configuration references** — never paste secrets into logs/chat.
7. **Wait for readiness** — use defined readiness signal; do not use arbitrary delay as proof.
8. **Run technical smoke tests** — health, routing, dependency, authentication/session, authorization denial, database connectivity, and observability.
9. **Run business smoke tests** — approved non-destructive critical flows with authorized synthetic/operational test identity.
10. **Validate data/audit** — expected migration state, integrity/reconciliation checks, tenant boundary, audit/correlation evidence.
11. **Enable traffic progressively** — only if the deployment mechanism supports an approved strategy; otherwise follow the rehearsed cutover plan.
12. **Declare technical completion** — only after all validation passes.

## 6. Mandatory Stop Conditions

Immediately HOLD and invoke incident/rollback decision when any occurs:

- Artifact/config/migration identity differs from approved record.
- Unexpected migration output, lock contention, integrity failure, or reconciliation mismatch.
- Authentication/session failure or authorization/RLS/cross-tenant anomaly.
- Suspected data loss, corruption, duplicate financial action, or audit gap.
- New Sev-1/Sev-2 symptom.
- Error/latency/saturation exceeds approved rollback threshold for its observation window.
- Monitoring or required responder becomes unavailable.
- Smoke test fails or expected result is ambiguous.
- Deployment cannot complete within the approved rollback decision window.

Do not improvise a production fix. Choose HOLD, rollback, or an separately authorized incident action.

## 7. Validation Checklist

### Technical

- [ ] Version/digest reported by runtime matches approved artifact.
- [ ] Health/readiness endpoints pass.
- [ ] Auth sign-in, callback/session, refresh, and sign-out pass as applicable.
- [ ] Authorized critical read/write succeeds; forbidden and cross-tenant action is denied.
- [ ] API response/error/correlation behavior is intact.
- [ ] Database migration state and reconciliation checks match expectation.
- [ ] Logs, traces, metrics, and alerts are present without sensitive leakage.
- [ ] Dependencies, queues, jobs, and integration paths are healthy.

### Business

- [ ] Critical in-scope workflows pass with approved test data.
- [ ] Financial/approval/recovery workflow does not duplicate or skip required state.
- [ ] Audit/history evidence is reconstructable.
- [ ] Known deferred/501 paths remain safely unavailable and documented.

## 8. Initial Observation and Hypercare

- **First 30 minutes:** continuous technical observation; no unrelated change.
- **First 4 hours:** elevated on-call; review every 30 minutes or on alert.
- **First 24 hours:** Support triage tags release-related issues; Engineering/Security/Database owners available.
- **Seven days:** enhanced trend review for error, latency, saturation, auth, authorization, tenant anomalies, data integrity, and business failure rate.

Release-specific thresholds must be filled before approval:

```text
Error-rate rollback threshold:
Latency rollback threshold:
Authentication failure threshold:
Database saturation/connection threshold:
Queue/backlog threshold:
Data-integrity trigger: any confirmed occurrence
Cross-tenant/security trigger: any confirmed or credible occurrence
Observation window:
```

## 9. Completion

Release Manager closes the release only after:

- [ ] Smoke/business validation complete.
- [ ] Hypercare owner accepts monitoring handoff.
- [ ] Communication confirms availability and known issues.
- [ ] Change freeze released.
- [ ] Actual duration, evidence, deviations, incidents, and decisions recorded.
- [ ] Post-implementation review scheduled within five business days.
- [ ] Support lifecycle record updated.

## 10. Current Blocker Notice

As of 2026-07-22, this runbook is **not executable** because the repository does not contain a project-owned deployment manifest and required Production Readiness evidence is absent. No Production action is authorized by this document.
