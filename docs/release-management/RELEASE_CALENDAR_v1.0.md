# PAYSAVE OS — Release Calendar v1.0

- **Owner:** Principal Release Manager
- **Timezone:** Asia/Bangkok (ICT, UTC+7)
- **Status:** Pending CTO Approval
- **Calendar type:** Reserved governance windows; not deployment authorization

## 1. Standard Cadence

| Activity                            | Cadence                                                                   | Standard window (ICT)                     |
| ----------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------- |
| Scope intake                        | Continuous; cutoff by train                                               | Before first Alpha freeze                 |
| Alpha                               | Weekly during active train                                                | Thursday, business hours                  |
| Beta Gate                           | Once per train                                                            | Tuesday, business hours                   |
| RC Gate                             | Once per train after Beta exit                                            | Tuesday, business hours                   |
| RC bake                             | Minimum 7 consecutive calendar days; strategy uses 14-day train allowance | Production-like Staging                   |
| Production                          | Monthly, second Tuesday                                                   | 21:00–23:00                               |
| Planned Patch                       | Weekly when approved candidate exists                                     | Wednesday, 21:00–23:00                    |
| Hotfix                              | Event-driven                                                              | Any time under Emergency Change Authority |
| Release retrospective               | Per Production release                                                    | Within 5 business days                    |
| Restore/DR drill                    | Quarterly                                                                 | Separately approved maintenance window    |
| Support/dependency lifecycle review | Quarterly                                                                 | First month of quarter                    |
| Release policy review               | Annually and after major incident                                         | Scheduled by Release Manager              |

A reserved window is automatically skipped when evidence or approval is incomplete. There is no obligation to release monthly.

## 2. Proposed Release Trains — 2026

Dates were selected to place Production on the second Tuesday and keep an explicit Beta → RC → Production sequence.

| Train   | Alpha 1        | Alpha 2        | Beta Gate      | RC Gate target | Earliest Production window  |
| ------- | -------------- | -------------- | -------------- | -------------- | --------------------------- |
| 2026.09 | Thu 2026-08-06 | Thu 2026-08-13 | Tue 2026-08-18 | Tue 2026-08-25 | Tue 2026-09-08, 21:00–23:00 |
| 2026.10 | Thu 2026-09-10 | Thu 2026-09-17 | Tue 2026-09-22 | Tue 2026-09-29 | Tue 2026-10-13, 21:00–23:00 |
| 2026.11 | Thu 2026-10-08 | Thu 2026-10-15 | Tue 2026-10-20 | Tue 2026-10-27 | Tue 2026-11-10, 21:00–23:00 |
| 2026.12 | Thu 2026-11-05 | Thu 2026-11-12 | Tue 2026-11-17 | Tue 2026-11-24 | Tue 2026-12-08, 21:00–23:00 |

All dates remain **HOLD by default** until the corresponding milestone checklist passes. Because PAYSAVE currently lacks RC/Production evidence, this calendar does not assert that any 2026 Production window is achievable.

## 3. Train Rules

### Scope Cutoff

- Target scope is proposed before Alpha 1.
- Feature scope freezes at Beta entry.
- RC accepts blocker fixes only.
- Any feature added after Beta freeze resets the train to Beta or later train.

### Candidate Cutoff

- RC artifact and evidence must be ready before the RC Gate meeting.
- A changed RC gets `-rc.N+1` and restarts applicable evidence/bake.
- Production may use only the exact approved RC artifact.

### Window Confirmation

- T-7 days: preliminary Production Readiness review.
- T-2 business days: final evidence and staffing check.
- T-15 minutes: explicit GO/NO-GO.
- Missing approver, monitoring, backup, rollback, or evidence means HOLD.

## 4. Blackout and Collision Rules

No routine Production release during:

- Official public holiday or organization-declared closure
- Payroll, settlement, finance close, regulatory filing, or business-critical batch window identified by Business/Finance Owner
- Active Sev-1/Sev-2 incident or provider degradation
- Concurrent high-risk infrastructure/database/security change
- Annual year-end blackout: **20 December through 5 January**, unless Emergency Change Authority approves a hotfix
- Any period without staffed on-call, database, security, support, and rollback coverage

Release Manager must re-check the official holiday/business calendar before locking each train. If a standard window collides, move to the next approved window; do not silently release outside governance.

## 5. Patch Calendar

- Standard: Wednesday 21:00–23:00 ICT.
- Candidate must pass Patch Policy, RC requirements appropriate to risk, Production Readiness, and GO/NO-GO.
- No patch is scheduled in the same week as a Production MINOR/MAJOR release unless CTO approves consolidation/separation.
- Missing candidate means window is simply unused.

## 6. Hotfix Calendar

Hotfixes are unscheduled and incident-driven. Emergency timing does not waive:

- Incident/change authority
- Immutable artifact identity
- Independent review
- Relevant test/security/tenant/data gates
- Backup and rollback readiness
- Monitoring, responders, and communication

## 7. Quarterly Governance Calendar

| Quarter | Required review/drill                                                            |
| ------- | -------------------------------------------------------------------------------- |
| Q1      | Restore/DR drill; support/EOL review; dependency/runtime review                  |
| Q2      | Restore/DR drill; performance/capacity forecast; access/on-call review           |
| Q3      | Restore/DR drill; support/EOL review; release-process audit                      |
| Q4      | Restore/DR drill; annual policy review; next-year calendar and blackout approval |

Restore evidence must demonstrate real recoverability; backup configuration alone is not a PASS.

## 8. Release Calendar Record

For every train, record:

```text
Train ID:
Target SemVer:
Scope cutoff:
Alpha dates/results:
Beta Gate date/result:
RC Gate date/result:
RC version/digest and bake dates:
Production window/result:
Patch/hotfix windows used:
Blackout/conflict review:
Approvers and staffing:
Retrospective date/actions:
```

## 9. Calendar Change Control

- Release Manager may move an unapproved Alpha/Beta meeting and records the reason.
- Moving RC/Production requires affected owner confirmation.
- Releasing outside a standard window requires CTO/Change Authority approval.
- Calendar change never overrides a failed gate.
