# PAYSAVE OS — Migration Batch #1 Report v1.0

> **Sprint:** Database Engineering — Migration Batch #1  
> **Scope:** M001 Foundation, M002 Master Data, M003 IAM only  
> **Status:** APPROVED by Decision Owner  
> **PostgreSQL:** 16 and 17  
> **Deployment:** Not performed

## 1. Delivered artifacts

| Artifact                | Path                                                       |
| ----------------------- | ---------------------------------------------------------- |
| M001 Foundation         | `database/migrations/stage3_2_batch1/M001_foundation.sql`  |
| M002 Master Data        | `database/migrations/stage3_2_batch1/M002_master_data.sql` |
| M003 IAM                | `database/migrations/stage3_2_batch1/M003_iam.sql`         |
| Rollback drill          | `database/rollbacks/stage3_2_batch1/RB001_batch1.sql`      |
| SQL verification        | `database/tests/stage3_2_batch1_verify.sql`                |
| PostgreSQL 16/17 runner | `database/tests/stage3_2_batch1_verify.sh`                 |

No M004 or later migration was created.

## 2. Implemented scope

- 21 frozen business-domain schemas plus the `admin` utility schema are created idempotently as namespace foundation.
- Tables created: 16
  - Foundation tenant root: 1 — `tenant.partners`
  - Master Data: 5
  - IAM: 10
- Physical columns: 166
- Stage 3.1 column-contract comparison: 16/16 tables match; no missing, extra or reordered physical columns.
- PostgreSQL enum: none; the approved physical type standard uses governed `varchar(100)` codes.
- UUID identity: UUIDv7-compatible database generator with RFC version/variant bits.
- Every migration is wrapped in one transaction and uses replay-safe object creation.

## 3. Catalog results

The following catalog counts were observed identically after first apply and replay on PostgreSQL 16 and PostgreSQL 17:

| Object                                       | Count |
| -------------------------------------------- | ----: |
| Batch #1 tables                              |    16 |
| Foreign keys                                 |    55 |
| Indexes, including PK/unique/partial indexes |    57 |
| RLS policies                                 |    48 |
| Application triggers                         |    21 |

## 4. Verification results

| Verification                                           | PostgreSQL 16 | PostgreSQL 17 | Evidence                                                                                               |
| ------------------------------------------------------ | ------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| Apply M001→M003 to empty database                      | PASS          | PASS          | Transactional migration runner completed                                                               |
| Replay M001→M003 on populated database                 | PASS          | PASS          | Existing objects skipped safely; verification reran successfully                                       |
| Rollback guard rejects unapproved destructive rollback | PASS          | PASS          | Rollback failed closed without `app.allow_destructive_rollback=on`                                     |
| Authorized rollback drill                              | PASS          | PASS          | All 16 Batch #1 tables and owned schemas/functions removed                                             |
| FK integrity                                           | PASS          | PASS          | 55 FKs catalogued; deliberate invalid partner FK rejected                                              |
| Index creation                                         | PASS          | PASS          | 57 indexes catalogued after apply and replay                                                           |
| RLS                                                    | PASS          | PASS          | 16 tables ENABLE + FORCE RLS; own-tenant read passed; cross-tenant insert rejected; hard delete denied |
| Encryption storage contract                            | PASS          | PASS          | Empty ciphertext and non-positive key version rejected                                                 |
| `updated_at` trigger                                   | PASS          | PASS          | Timestamp advanced on mutable IAM row update                                                           |
| Published-version immutability trigger                 | PASS          | PASS          | Published catalog version mutation rejected                                                            |
| Mixed-scope master-data trigger                        | PASS          | PASS          | Owner-scope enforcement functions/triggers installed                                                   |
| Verification shell syntax                              | PASS          | PASS          | `bash -n` passed                                                                                       |
| M004+ absence                                          | PASS          | PASS          | No M004 or later file exists in Batch #1 directory                                                     |

Terminal completion markers:

```text
POSTGRES_16_BATCH1_PASS
POSTGRES_17_BATCH1_PASS
BATCH1_ALL_VERSIONS_PASS
```

## 5. RLS implementation

Batch #1 policies read a trusted transaction-local `request.jwt.claims` document:

- `sub` identifies `iam.users.auth_subject`.
- `paysave.active_partner_id` selects the tenant.
- `paysave.tenant_scope = all` identifies separately authorized global administration.
- Tenant access additionally requires an active, non-deleted `iam.memberships` row.
- Global control tables allow authenticated read/self-read and global-authority writes.
- Mixed Master Data allows authenticated global reads, same-tenant reads/writes and global-authority writes.
- Every Batch #1 table has both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`.
- Command-specific SELECT/INSERT/UPDATE policies avoid permissive-policy leakage; no DELETE policy is defined, enforcing soft retirement/effective dating.

No Backend/API claim issuer was created.

## 6. Trigger coverage

- 16 mutable-table `updated_at` trigger paths are represented across the Batch #1 table set where the physical column exists.
- Four Master Data owner-scope triggers prevent cross-owner hierarchy links and permit external mappings only to global or same-partner catalog items.
- One published-version trigger blocks UPDATE/DELETE after `published_at` is set.
- Audit-domain row-change triggers are not claimed in this batch because the frozen `audit.audit_events` table is outside M001–M003.

## 7. Deferred cross-batch FKs

Three relationships cannot be installed without creating forbidden later-batch tables. Their columns and indexes are present, and comments record the deferral:

1. `master_data.catalogs.business_object_id → workflow.business_objects`
2. `master_data.external_mappings.integration_id → platform.integrations`
3. `iam.membership_branch_scopes.(partner_id,branch_id) → tenant.branches.(partner_id,id)`

These are not counted among the 55 enforced Batch #1 FKs. They must be finalized only when their target migrations are approved. No placeholder table or fake relationship was created.

## 8. Forward-only and rollback model

- M001–M003 are forward-only production migrations.
- `RB001_batch1.sql` is a guarded destructive rollback drill for empty/pre-production verification only.
- Production recovery must use a new compensating forward migration.
- The rollback script requires explicit session guard `app.allow_destructive_rollback=on` and otherwise fails closed.

## 9. Encryption boundary

The database validates ciphertext presence and positive key version for `iam.users.display_name_encrypted`. Encryption/decryption and KMS operations remain outside SQL; no plaintext identity column, encryption key, secret or backend was created.

## 10. Approval gate

```text
Migration Batch #1 Implementation: COMPLETE
PostgreSQL 16 clean apply/replay/rollback: PASS
PostgreSQL 17 clean apply/replay/rollback: PASS
FK / Index / RLS / Encryption Storage / Trigger verification: PASS
M004 or later: NOT CREATED
Deployment: NOT PERFORMED
Batch #1 Approval: APPROVED
```

Batch #1 was approved; Batch #2 is tracked separately.
