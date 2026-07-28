# PAYSAVE OS — Internal Beta UAT Checklist

Status: BLOCKED / NOT STARTED. Result values: PASS, FAIL, BLOCKED, NOT RUN. Evidence is mandatory.

## Session identity

- Date/time:
- Release version / source revision / artifact digest:
- Staging Project Ref: `rptqfhtanjtrxtfbgrkb`
- Tester / role / synthetic tenant:
- Correlation IDs:

## Checklist

| ID     | Acceptance                                                      | Result  | Evidence / bug ID           |
| ------ | --------------------------------------------------------------- | ------- | --------------------------- |
| UAT-01 | Login succeeds for valid active tester                          | BLOCKED | Phase B JWT 503             |
| UAT-02 | Invalid/disabled/unauthorized login fails closed                | BLOCKED | JWT verification incomplete |
| UAT-03 | Dashboard shows only authorized tenant data                     | BLOCKED | current UI preview/mock     |
| UAT-04 | Receive case is idempotent and auditable                        | NOT RUN | live auth unavailable       |
| UAT-05 | Assign case persists with correct agent and timeline            | BLOCKED | current recovery UI mock    |
| UAT-06 | Status update enforces valid transitions                        | BLOCKED | atomic transition 501       |
| UAT-07 | Photo upload is private, validated, linked and visible          | BLOCKED | implementation absent       |
| UAT-08 | Timeline is append-only, ordered and correlated                 | NOT RUN | live auth unavailable       |
| UAT-09 | Approval enforces authority/SoD and stores reason               | BLOCKED | no live E2E path            |
| UAT-10 | Close case is atomic and reconciled                             | BLOCKED | close route 501             |
| UAT-11 | Reports match source totals and tenant/date filters             | BLOCKED | report page/API absent      |
| UAT-12 | Audit/error/activity records contain correlation ID, no secrets | BLOCKED | centralized sink absent     |
| UAT-13 | Monitoring and alert receiver detect injected safe failure      | BLOCKED | operational backend absent  |
| UAT-14 | Backup/restore/rollback evidence meets target environment       | BLOCKED | managed drill absent        |

## Acceptance rule

UAT passes only when every mandatory row is PASS, evidence is attached, no Sev-1/Sev-2 remains, and CTO explicitly authorizes Internal Beta opening. This checklist never authorizes External Beta or Production.
