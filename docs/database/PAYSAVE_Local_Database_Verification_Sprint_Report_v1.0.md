# PAYSAVE OS — Local Database Verification Sprint Report

**Version:** 1.0  
**Date:** 2026-07-22  
**Environment:** Local PostgreSQL only  
**Decision owner:** CTO  
**Status:** **PASS — VERIFICATION COMPLETE; WAITING FOR CTO REVIEW**  
**Production:** Not accessed / Not changed / Not deployed

## 1. CTO-authorized scope

CTO approved the Local PostgreSQL Environment only for:

- Migration Verification
- Performance Benchmark
- Backup
- Restore
- Query Plan
- `EXPLAIN ANALYZE`
- Index Verification

CTO rejected Local Runtime Integration because the production architecture uses Supabase Auth.

Explicit prohibitions honored during this sprint:

- no Authentication change or replacement;
- no new Repository or Repository change;
- no separate application Runtime;
- no Session change;
- no JWT change;
- no RLS Design change;
- no Production access or deployment.

When Supabase Staging is ready, work returns to **Stage 4.0 — Staging Database Integration**.

## 2. Gate verdict

**PASS — Local Database Verification objectives completed.**

This verdict proves only the authorized local database verification scope. It does not approve a local application runtime, Supabase replacement, Production readiness, Production deployment, or Stage 4.0 completion.

## 3. Environment evidence

| Item                   | Observed                                                                  |
| ---------------------- | ------------------------------------------------------------------------- |
| Host                   | macOS 26.5.2, arm64, Mac16,10                                             |
| Host CPU               | 10 logical CPUs                                                           |
| Host memory            | 17,179,869,184 bytes                                                      |
| Docker Engine          | 29.5.2                                                                    |
| Docker CLI             | 29.6.0                                                                    |
| Docker Compose         | 5.1.4                                                                     |
| Container image        | `postgres:17-alpine`                                                      |
| Image ID               | `sha256:742f40ea20b9ff2ff31db5458d127452988a2164df9e17441e191f3b72252193` |
| PostgreSQL             | 17.10                                                                     |
| Container CPUs visible | 4                                                                         |
| Container health       | healthy                                                                   |
| Bind                   | `127.0.0.1:55432` only                                                    |
| Persistent volume      | `paysave_local_pg17`                                                      |
| Local credential file  | present; values not read into this report                                 |
| Verification timestamp | 2026-07-22T08:30:02Z                                                      |

The database port is not internet-facing. No Production URL, token, password, JWT, cookie or database credential appears in the evidence.

## 4. Delivered verification artifacts

| Artifact                     | Path                                                           |
| ---------------------------- | -------------------------------------------------------------- |
| Full verification runner     | `database/local/run-local-database-verification.sh`            |
| Synthetic fixture            | `database/local/benchmark-fixture.sql`                         |
| pgbench query                | `database/local/benchmark-query.sql`                           |
| Query-plan verification      | `database/local/query-plan-verification.sql`                   |
| Index verification           | `database/local/index-verification.sql`                        |
| Updated local runbook        | `database/local/README.md`                                     |
| Integration rejection record | `docs/integration/PAYSAVE_Integration_Sprint_1_Report_v1.0.md` |
| Evidence directory           | `docs/database/evidence/local-database-verification/`          |

Verification-only code added: 5 files, 349 lines. No application feature, Authentication, Repository, Session, JWT, middleware, RLS policy or migration file was created or changed.

## 5. Migration verification

The authoritative sequence M001–M016 was replayed against the healthy PostgreSQL 17 local database.

| Check                                           | Result              |
| ----------------------------------------------- | ------------------- |
| Migration manifest                              | 16/16 files present |
| Replay M001–M016                                | PASS                |
| Permission catalog replay                       | PASS                |
| Approved schemas                                | 22                  |
| Application tables excluding default partitions | 114                 |
| RLS policies                                    | 342                 |
| Backend Sprint #1 permission rows               | 12                  |
| `pgcrypto`                                      | installed           |
| Shell syntax                                    | PASS                |

Completion markers:

```text
PAYSAVE_LOCAL_M001_M016_APPLY_PASS
PAYSAVE_LOCAL_DATABASE_VERIFY_PASS
```

Evidence:

- `docs/database/evidence/local-database-verification/00-migration-replay.log`
- `docs/database/evidence/local-database-verification/00-baseline-verification.log`

## 6. Backup verification

A PostgreSQL custom-format backup was generated outside the repository.

| Check                                  | Result                                                             |
| -------------------------------------- | ------------------------------------------------------------------ |
| `pg_dump -Fc`                          | PASS                                                               |
| Non-empty artifact                     | PASS                                                               |
| `pg_restore --list` catalog validation | PASS                                                               |
| File mode                              | `600` (`-rw-------`)                                               |
| Size                                   | 912,346 bytes                                                      |
| SHA-256                                | `c2be185b9f846b65e649d28ba7de309737af1d5a4a3af7013393a7387f9e126b` |

The absolute local backup path is recorded in `01-backup.log`; no password or connection string is stored.

Completion marker:

```text
PAYSAVE_LOCAL_BACKUP_PASS
```

## 7. Restore verification

The backup was restored into the guarded disposable database `paysave_local_verification`.

| Restored object check | Expected | Observed | Result |
| --------------------- | -------: | -------: | ------ |
| Application tables    |      114 |      114 | PASS   |
| RLS policies          |      342 |      342 | PASS   |
| Permission rows       |       12 |       12 | PASS   |
| PostgreSQL version    |     17.x |    17.10 | PASS   |

After the run, the disposable database was dropped. A catalog query observed zero databases named `paysave_local_verification`.

Completion marker:

```text
PAYSAVE_LOCAL_RESTORE_VERIFY_PASS
verification_db_cleanup=PASS
```

Evidence: `docs/database/evidence/local-database-verification/02-restore.log`

## 8. Synthetic benchmark design

Performance tests did not mutate the persistent source database. The runner:

1. created a verified custom-format backup;
2. restored it to the disposable verification database;
3. inserted one synthetic tenant and 100,000 synthetic customer rows only in that database;
4. ran `ANALYZE`;
5. executed index and query-plan checks;
6. ran prepared-statement `pgbench` with 8 clients and 4 threads for 10 seconds;
7. dropped the disposable database.

Synthetic relation size was approximately 43 MB. The synthetic encrypted/hash fields contain generated test bytes only and no personal or Production data.

Evidence: `docs/database/evidence/local-database-verification/03-fixture.log`

## 9. Index verification

| Check                           |    Observed | Result |
| ------------------------------- | ----------: | ------ |
| Total indexes                   |         603 | PASS   |
| Invalid indexes                 |           0 | PASS   |
| Not-ready indexes               |           0 | PASS   |
| Duplicate definition groups     |           0 | PASS   |
| Representative business indexes | 9/9 present | PASS   |

Representative checks cover:

- Customer status and normalized-name hash
- Recovery case status and customer
- Workforce assignment agent and status
- Asset type/status
- Finance payment customer
- Outbox idempotency uniqueness

No index was added, removed, rebuilt or changed.

Completion marker:

```text
PAYSAVE_LOCAL_INDEX_VERIFY_PASS
```

Evidence: `docs/database/evidence/local-database-verification/04-index-verification.log`

## 10. Query plan and EXPLAIN ANALYZE

All measured queries completed below the verification threshold of 100 ms.

| Query                                     | Chosen plan/index                       | Assertion execution | Evidence execution | Result |
| ----------------------------------------- | --------------------------------------- | ------------------: | -----------------: | ------ |
| Tenant + selective status + ordered limit | Index-only scan — `ix_customers_status` |            0.067 ms |           0.033 ms | PASS   |
| Tenant + exact normalized-name hash       | Index scan — `ix_customers_name_hash`   |            0.023 ms |           0.010 ms | PASS   |
| ID keyset pagination + filters            | Index scan — `customers_pk`             |            0.109 ms |           0.088 ms | PASS   |

Planner behavior was validated rather than forced:

- A high-selectivity status query uses the composite status index.
- Exact hash lookup uses the partial hash index.
- ID cursor pagination uses the primary-key index because it directly satisfies `id > cursor ORDER BY id LIMIT ...`.

Two initial test assertions incorrectly required the composite status index for every shape. PostgreSQL selected `customers_pk` for the low-selectivity/ID-keyset shapes and executed them in 0.049–0.103 ms. The verification was corrected to model planner selectivity; the index design was not changed.

Completion marker:

```text
PAYSAVE_LOCAL_QUERY_PLAN_VERIFY_PASS
```

Evidence: `docs/database/evidence/local-database-verification/05-query-plans.log`

## 11. pgbench performance result

Workload: prepared exact-hash customer lookup against 100,000 synthetic rows.

| Metric                           |         Result |
| -------------------------------- | -------------: |
| Clients                          |              8 |
| Threads                          |              4 |
| Duration                         |     10 seconds |
| Transactions                     |      1,927,821 |
| Failed transactions              |     0 (0.000%) |
| Average latency                  |       0.040 ms |
| Latency standard deviation       |       0.027 ms |
| TPS excluding initial connection | 193,102.650400 |
| Verification floor               |        100 TPS |

Completion marker:

```text
PAYSAVE_LOCAL_PERFORMANCE_PASS tps=193102.650400 minimum=100
```

Evidence: `docs/database/evidence/local-database-verification/06-pgbench.log`

This is a local synthetic point-lookup benchmark, not a Production capacity claim. It does not model network latency, Supabase/PostgREST overhead, mixed writes, real tenant cardinality, concurrent business workflows, storage saturation or Production hardware.

## 12. Evidence inventory

| File                           | Purpose                                     |
| ------------------------------ | ------------------------------------------- |
| `00-migration-replay.log`      | M001–M016 replay evidence                   |
| `00-baseline-verification.log` | Schemas/tables/RLS/permission baseline      |
| `01-backup.log`                | Backup completion marker/path               |
| `02-restore.log`               | Restored catalog verification               |
| `03-fixture.log`               | Synthetic fixture count/size                |
| `04-index-verification.log`    | Index health and representative definitions |
| `05-query-plans.log`           | `EXPLAIN ANALYZE`, buffers and timings      |
| `06-pgbench.log`               | Throughput, latency and failure count       |
| `07-result.log`                | Final completion marker                     |

## 13. Scope-preservation audit

| Prohibition                 | Result        |
| --------------------------- | ------------- |
| Change Authentication       | Not performed |
| Create/change Repository    | Not performed |
| Create separate Runtime     | Not performed |
| Change Session              | Not performed |
| Change JWT                  | Not performed |
| Change RLS Design           | Not performed |
| Change migrations M001–M016 | Not performed |
| Connect/deploy Production   | Not performed |
| Use Production data         | Not performed |

The runner reads existing RLS/index catalogs for verification only. It does not alter policies or security design.

## 14. Final Gate

```text
Local PostgreSQL Environment: APPROVED BY CTO
Local Runtime Integration Sprint: REJECTED BY CTO
Migration Verification: PASS
Backup: PASS
Restore: PASS
Performance Benchmark: PASS
Query Plan / EXPLAIN ANALYZE: PASS
Index Verification: PASS
Disposable Database Cleanup: PASS
Authentication / Repository / Runtime / Session / JWT / RLS Design Changes: NONE
Production Access / Deployment: NONE
Stage 4.0 Staging Database Integration: WAITING FOR SUPABASE
Local Database Verification Sprint: COMPLETE — WAITING FOR CTO REVIEW
```
