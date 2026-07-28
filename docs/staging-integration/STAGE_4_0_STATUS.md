# Stage 4.0 — Supabase Staging Integration Status

**Observed:** 2026-07-23T11:00:55Z  
**Decision:** **HOLD — M001–M016 APPLIED/REPLAYED; OPERATIONAL BLOCKERS REQUIRE CTO REVIEW**

## Approved scope

- Supabase Cloud project `paysave-staging`
- Project Ref `rptqfhtanjtrxtfbgrkb`
- Region `ap-southeast-1`
- Staging only
- Approved migrations M001–M016 only
- No Production deployment, Production database, Production secrets, architecture change, unapproved migration or new schema design

## Phase B result

| Control                          | Result                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Supabase CLI authentication/link | PASS — exact ref verified                                                                                                        |
| Secret Manager                   | BLOCKED — Vault secrets 0; Edge secrets 0; app runtime manager absent                                                            |
| Environment variables            | BLOCKED — no approved Next.js runtime injection                                                                                  |
| M001–M016 apply                  | PASS — 16/16; ledger 16/16                                                                                                       |
| Migration replay                 | PASS — 16/16; post-apply/replay schemas byte-identical                                                                           |
| Remote structure                 | 22 schemas, 114 tables, 107 RLS tables, 342 policies                                                                             |
| RLS/cross-tenant                 | PASS at database claim layer; zero fixture leftovers                                                                             |
| Valid Supabase JWT               | BLOCKED — no approved test identity; M001–M016 contain no custom access-token hook and the legacy hook is outside approved scope |
| Logical backup/restore           | PASS — restored to disposable PostgreSQL 17                                                                                      |
| Managed backup/PITR/restore      | BLOCKED — backups null, PITR disabled                                                                                            |
| Alert rules                      | PASS static — 4 rules                                                                                                            |
| Fire → Alert → Ack → Recover     | BLOCKED — no managed backend/router                                                                                              |

## Critical runtime blocker

`admin.uuid_v7()` references `public.gen_random_bytes(16)` while Supabase installs pgcrypto functions under `extensions`.

- Direct call: FAIL
- UUID default columns affected: 121
- No migration/schema patch applied because Phase B prohibits changes outside approved M001–M016

## Security and hygiene

- Production: not connected/accessed
- Secret values: not persisted in reports/repository
- Synthetic database fixtures/roles: 0 leftovers
- Synthetic Auth users: 0
- Canonical M001–M016 files: unchanged

## Deliverables

See `docs/staging-integration/phase-b/`:

- `SECRET_MANAGER_REPORT.md`
- `MIGRATION_VERIFICATION_REPORT.md`
- `JWT_RLS_VERIFICATION_REPORT.md`
- `BACKUP_RESTORE_REPORT.md`
- `MONITORING_EVIDENCE.md`
- `STAGE_4_0_INTEGRATION_REPORT.md`

## Gate

Stage 4.0 remains fail-closed. **หยุดรอ CTO Review**; Beta Release Gate และ Production deploymentไม่ได้เปิด
