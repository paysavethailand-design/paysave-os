# Implementation Readiness Report — Stage 4.0 Phase C.1

| Capability                    | Code readiness                                                                         | Operational evidence                                                                | Beta status                                                  |
| ----------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| JWT claim resolver            | Fail-closed handler and tests exist                                                    | Staging probe fails permission check                                                | BLOCKED                                                      |
| Recovery list/detail/timeline | Staging runtime adapter implemented; same-origin authenticated fetch; no mock fallback | Unit tests pass; live authenticated UAT unavailable while JWT is blocked            | PARTIAL                                                      |
| Recovery write commands       | Adapter intentionally fails closed                                                     | No supported API contract for all UI commands                                       | BLOCKED                                                      |
| Workflow lifecycle            | 10 routes explicitly return 501                                                        | No atomic transaction architecture                                                  | BLOCKED                                                      |
| Upload Photo                  | Metadata schema only                                                                   | No bucket/upload/signed URL/validation/audit E2E                                    | BLOCKED                                                      |
| Reports                       | Navigation only                                                                        | No product report page/API                                                          | DEFER; operational beta report must be manual/evidence-based |
| Minimum monitoring            | Dependency-aware readiness, metrics, structured error and correlation ID code exists   | Tests/build pass; no external backend/dashboard/receiver                            | PARTIAL                                                      |
| Backup/PITR/restore           | Local tooling only                                                                     | Managed Staging evidence absent; prior provider readback showed PITR off/no backups | BLOCKED                                                      |
| Application rollback          | Local candidate and previous images both passed health probes                          | No immutable previous Staging image or Staging rehearsal                            | LOCAL PASS / STAGING BLOCKED                                 |
| Configuration rollback        | Drill artifact exists                                                                  | Artifact status FAIL                                                                | BLOCKED                                                      |

## Workflow 501 endpoint matrix

| Endpoint                             | Root cause                         | Temporary limitation         | Required implementation                    | Risk                          |
| ------------------------------------ | ---------------------------------- | ---------------------------- | ------------------------------------------ | ----------------------------- |
| `POST /cases/{caseId}/close`         | No atomic multi-aggregate boundary | Cannot close                 | Approved Unit of Work + outbox/idempotency | Partial close/data divergence |
| `POST /cases/{caseId}/reopen`        | Same                               | Cannot reopen                | Transactional reopen command               | State/history divergence      |
| `POST /assignments/{id}/reassign`    | Same                               | Cannot transfer ownership    | Transactional reassignment/handoff         | Duplicate or lost ownership   |
| `POST /assignments/{id}/accept`      | Same                               | Cannot accept                | Versioned assignment command               | Race/double acceptance        |
| `POST /assignments/{id}/reject`      | Same                               | Cannot reject/requeue        | Atomic reject + requeue/outbox             | Orphan work                   |
| `POST /assignments/{id}/complete`    | Same                               | Cannot complete              | Atomic completion + workflow/timeline      | False completion              |
| `POST /workflow/transitions`         | Same                               | Validation only; no mutation | Versioned workflow executor                | Invalid partial transition    |
| `POST /promises-to-pay/{id}/fulfill` | Same                               | Cannot fulfill               | Evidence-bound transactional command       | Payment/case mismatch         |
| `POST /promises-to-pay/{id}/broken`  | Same                               | Cannot mark broken/follow up | Transactional breach handler               | Missed collection action      |
| `POST /promises-to-pay/{id}/cancel`  | Same                               | Cannot cancel                | Transactional cancel command               | Promise/history mismatch      |

## Reports for Internal Beta

**Required before beta:** daily tester result, error/correlation-ID list, case-flow pass/fail, security/access exceptions, blocker register. These can be produced from operational evidence without a new product report feature.

**Deferrable:** executive dashboard, downloadable scheduled report, productivity/commission analytics, historical trend visualization.
