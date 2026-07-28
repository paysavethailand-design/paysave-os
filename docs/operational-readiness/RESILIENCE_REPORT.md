# Resilience Report

**Program date:** 2026-07-23  
**Overall status:** **BLOCKED**  
**Local controls:** **PASS**

## Verified local evidence

| Control                              | Result | Evidence                                                                                                                 |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------ |
| Local PostgreSQL backup              | PASS   | `database/local/run-local-database-verification.sh`                                                                      |
| Local restore verification           | PASS   | `PAYSAVE_LOCAL_DATABASE_VERIFICATION_PASS`                                                                               |
| Restored objects                     | PASS   | 114 tables, 342 RLS policies, 603 indexes, invalid indexes 0                                                             |
| Synthetic performance check          | PASS   | 100,000 rows; pgbench failed transactions 0                                                                              |
| Rollback safety tooling              | PASS   | Local-only policy, remote/Production rejection, redacted evidence                                                        |
| Rollback unit tests                  | PASS   | 16/16 tests                                                                                                              |
| Local application rollback rehearsal | PASS   | Hardened candidate `sha256:ca13ce…` → prior local image `sha256:d4da1b…`; `/healthz`, `/readyz`, `/version` all HTTP 200 |
| Candidate health contract            | PASS   | Redacted evidence: `artifacts/operational-readiness/local-rollback-drill.json`                                           |

## Operational blockers

1. Managed Staging backup/PITR policy evidence is absent.
2. Staging restore-point creation and restore drill have not been verified.
3. Approved RPO/RTO targets and measured Staging results are absent.
4. A known-good immutable previous Staging image has not been approved.
5. Application rollback and post-rollback data-integrity verification are not complete in Staging.
6. Disaster Recovery rehearsal, incident timeline and owner sign-off are absent.

## Evidence policy

Local backup/restore and local container rehearsal prove tooling only. They do **not** substitute for managed Staging recovery evidence.

## Decision

Resilience remains **BLOCKED** until the Staging restore, rollback and DR checklist are executed and signed off.
