# PAYSAVE OS — Rollback Plan and Runbook v1.0

- **Owner:** Principal Release Manager
- **Technical owners:** Platform/Operations and Database Owners
- **Decision authority:** Incident Commander + CTO/Production Change Authority
- **Status:** Pending CTO Approval
- **Continuity target:** RPO ≤ 5 minutes; DR-A RTO ≤ 4 hours
- **Important:** This runbook does not authorize database commands. Exact rehearsed commands must be supplied by the approved deployment/migration mechanism before Production GO.

## 1. Objective

Restore a known-safe supported state while preserving data integrity, tenant isolation, audit evidence, and incident traceability. Rollback is a controlled release action, not an improvised production edit.

## 2. Rollback Strategies

| Strategy                            | Use when                                                                  | Data impact                                      | Required proof                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Traffic disable/feature containment | Affected capability can be safely isolated by an already approved control | No intended data reversal                        | Rehearsed control and business impact approval                                         |
| Application rollback                | New artifact fails but previous version remains schema/config compatible  | New writes may exist; reconciliation required    | Previous artifact, compatibility matrix, smoke/reconciliation tests                    |
| Configuration rollback              | Approved configuration change causes failure                              | Depends on setting                               | Previous config digest, secret references, restart behavior rehearsed                  |
| Migration rollback                  | Migration has an approved, tested, non-destructive reverse path           | Potentially high                                 | Exact reverse script, restore point, rehearsal, Database Owner approval                |
| Forward fix                         | Reverse migration is unsafe but a narrowly scoped correction is safer     | Controlled by fix                                | Incident authorization, tested fix, data validation, rollback of fix                   |
| PITR/restore                        | Corruption/data loss cannot be contained otherwise                        | Writes after recovery point may be lost/replayed | CTO/Incident Commander authorization, RPO analysis, restore drill, reconciliation plan |

PITR/restore is a last-resort disaster-recovery action, not the default deployment rollback.

## 3. Trigger Conditions

Rollback decision must be initiated when any occurs:

- Confirmed or credible cross-tenant exposure, authorization bypass, secret exposure, or privileged-access anomaly
- Suspected data loss, corruption, duplicate financial/business effect, broken audit chain, or migration integrity failure
- Sev-1 incident or release-caused Sev-2 incident
- Failed critical smoke/UAT-equivalent Production validation
- Error, latency, saturation, connection, queue, or dependency metric crosses the approved threshold for the defined observation window
- Deployment cannot complete within the approved change/rollback window
- Required monitoring, incident response, or data validation becomes unavailable
- Artifact, configuration, or migration identity differs from the approved release record

Security/data-integrity triggers require immediate containment; they do not wait for a trend window.

## 4. Decision Matrix

| Condition                                      | Default decision                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Pre-traffic deployment failure, no data change | Abort and restore previous artifact/config                                                             |
| Application defect, schema backward compatible | Application rollback                                                                                   |
| Configuration-only failure                     | Configuration rollback                                                                                 |
| New writes occurred under new version          | Contain, preserve evidence, assess compatibility and reconcile before/after rollback                   |
| Migration partially applied                    | Stop; Database Owner assesses approved migration state; no ad hoc reverse SQL                          |
| Destructive/incompatible migration             | Use pre-approved forward-fix or restore strategy; do not assume application rollback is safe           |
| Cross-tenant/security event                    | Contain access, invoke security incident process, preserve logs/audit, rollback if it reduces exposure |
| Data corruption/loss                           | Stop writes, preserve evidence, establish recovery point, CTO-authorized restore/reconciliation        |

## 5. Roles

- **Incident Commander:** Owns incident priorities and rollback recommendation.
- **CTO/Change Authority:** Authorizes Production rollback/restore and risk acceptance.
- **Release Manager:** Maintains timeline, decision log, artifact identity, and communications coordination.
- **Rollback Executor:** Runs only rehearsed approved steps.
- **Database Owner:** Controls migration, recovery point, restore, and reconciliation decisions.
- **Security Owner:** Directs containment/evidence for security/privacy events.
- **Validator/QA:** Independently validates restored state.
- **Business Owner:** Assesses operational impact and validates critical workflow recovery.
- **Communications/Support:** Issues approved updates and tracks affected users/cases.

## 6. Required Rollback Record

```text
Incident/change ID:
Release/version being rolled back:
Current artifact/config/migration state:
Previous known-good version and digest:
Trigger and first-observed timestamp:
Impact and affected tenants/data/workflows:
Last known-good timestamp:
Candidate recovery point:
Chosen strategy and rationale:
Expected data loss/replay window:
Decision authority and timestamp:
Executor/validator:
Validation and reconciliation plan:
```

## 7. Pre-Execution Safety Checks

- [ ] Incident command established and unrelated changes frozen.
- [ ] Current artifact/config/migration state captured.
- [ ] Logs, traces, audit evidence, and relevant data snapshots preserved according to policy.
- [ ] Blast radius and tenant/data impact assessed.
- [ ] Previous artifact/config authenticity and compatibility verified.
- [ ] Latest safe recovery point and expected RPO impact identified.
- [ ] Database writes paused only through an approved mechanism if required.
- [ ] Exact rollback steps match Staging rehearsal.
- [ ] Validator, Security, Database, Support, and Communications are present.
- [ ] Roll-forward alternative considered; selected strategy approved.

## 8. Application/Configuration Rollback Procedure

Exact commands must be referenced from the approved deployment mechanism.

1. Incident Commander declares rollback and scope.
2. Release Manager records decision, version/digest, and timestamp.
3. Contain traffic/affected capability through an approved rehearsed control if needed.
4. Database Owner confirms schema compatibility with previous application version.
5. Rollback Executor deploys the previous immutable artifact; no rebuild.
6. Restore the previous approved configuration references/digest where required; never expose secret values.
7. Wait for explicit readiness/health signals.
8. Validator runs technical smoke tests.
9. Business Owner/QA runs approved critical workflow checks.
10. Database Owner runs reconciliation/integrity checks for writes created during the failed release.
11. Security Owner validates authorization/tenant/audit controls when relevant.
12. Incident Commander decides recovered / continue containment / escalate to restore.

## 9. Database Migration Rollback / Forward-fix

- Never edit or rerun an applied migration blindly.
- Never execute ad hoc DDL/SQL from chat or during a pressured go-live.
- Reverse only when an approved rollback artifact has passed clean-install, upgrade, reverse-order, integrity, and restoration rehearsal.
- If reverse would discard valid writes or violate a later contract, prefer an approved forward-fix or controlled restore.
- For partially applied migration, first identify committed state and migration ledger; do not assume atomicity.
- Record row-count/integrity/reconciliation evidence before and after.
- Migration rollback requires Database Owner and CTO/Change Authority approval.

## 10. PITR / Restore Procedure

Use only when normal rollback cannot protect integrity or availability.

1. Stop/contain writes through an approved mechanism.
2. Determine last known-good timestamp and candidate recovery point.
3. Quantify expected loss/replay window against RPO ≤ 5 minutes.
4. Preserve current failed state for investigation where safe.
5. CTO/Incident Commander authorizes restore target and data-impact plan.
6. Database Owner executes the provider-approved rehearsed restore procedure.
7. Restore/validate coupled object metadata/evidence consistency where applicable.
8. Validate schemas, migration state, RLS, FK/integrity, critical row counts, encryption access, and tenant boundaries.
9. Reconcile/replay authorized transactions from immutable sources where available.
10. Validate critical workflows before reopening traffic.
11. Record actual RPO, RTO, missing/replayed records, and approvals.

If restore cannot meet RTO ≤ 4 hours, escalate immediately; do not hide the breach.

## 11. Post-Rollback Validation

- [ ] Runtime reports previous known-good version/digest.
- [ ] Health/readiness and dependencies pass.
- [ ] Auth/session, RBAC/RLS, and cross-tenant denial pass.
- [ ] Critical read/write workflows pass.
- [ ] Migration state and integrity checks match expected state.
- [ ] No new data corruption, duplication, orphan, or audit gap detected.
- [ ] Logs/metrics/alerts recovered and no sensitive data leaked.
- [ ] Business and Support validate service restoration.
- [ ] Monitoring remains elevated for the incident-defined period.

## 12. Communications

Required messages:

1. Rollback initiated — impact, containment, next update time.
2. Rollback completed/failed — current availability and known data impact.
3. Recovery validation — service status, support guidance, remaining investigation.
4. Closure — root-cause timeline, affected versions, corrected release plan, and follow-up owners.

Never include secrets, raw restricted data, or speculative blame.

## 13. Closure and Follow-up

- Release remains yanked/blocked until root cause is resolved and a new candidate passes gates.
- Complete incident review within five business days for Sev-1/Sev-2 or failed rollback.
- Update runbooks/checklists from verified lessons.
- Record actual RTO/RPO and any breach.
- Preserve release, incident, migration, reconciliation, and approval evidence.
- A corrected artifact gets a new version/candidate number; never reuse the failed artifact identity.

## 14. Current Executability Notice

As of 2026-07-22, no project-owned deployment manifest and no completed live restore/rollback drill are evidenced. This runbook is a required governance artifact but **must not be executed in Production** until environment-specific steps are authored, rehearsed, and approved.
