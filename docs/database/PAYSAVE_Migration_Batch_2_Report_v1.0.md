# PAYSAVE OS — Migration Batch #2 Report v1.0

> **Sprint:** Database Engineering — Migration Batch #2  
> **Scope:** M004 Partner, M005 Customer, M006 Contract, M007 Asset only  
> **Prerequisite:** Migration Batch #1 approved  
> **Status:** APPROVED by Decision Owner  
> **PostgreSQL:** 16 and 17  
> **Deployment:** Not performed

## 1. Delivered artifacts

| Artifact                | Path                                                    |
| ----------------------- | ------------------------------------------------------- |
| M004 Partner            | `database/migrations/stage3_2_batch2/M004_partner.sql`  |
| M005 Customer           | `database/migrations/stage3_2_batch2/M005_customer.sql` |
| M006 Contract           | `database/migrations/stage3_2_batch2/M006_contract.sql` |
| M007 Asset              | `database/migrations/stage3_2_batch2/M007_asset.sql`    |
| Rollback drill          | `database/rollbacks/stage3_2_batch2/RB002_batch2.sql`   |
| Verification SQL        | `database/tests/stage3_2_batch2_verify.sql`             |
| PostgreSQL 16/17 runner | `database/tests/stage3_2_batch2_verify.sh`              |

No M008 or later migration was created.

## 2. Implemented scope

- Tables created: 14
  - Partner: 2
  - Customer: 4
  - Contract: 1
  - Asset: 7
- Physical columns: 166
- Stage 3.1 column-contract comparison: 14/14 tables match, with no missing, extra or reordered physical columns.
- M004 finalizes the previously deferred composite FK from `iam.membership_branch_scopes` to `tenant.branches`.
- No PostgreSQL enum was introduced.
- Every migration is transactional, forward-only and replay-safe.

## 3. Catalog results

Counts observed identically after first apply and replay on PostgreSQL 16 and PostgreSQL 17:

| Object                                            | Count |
| ------------------------------------------------- | ----: |
| Batch #2 tables                                   |    14 |
| FKs owned by Batch #2 tables                      |    57 |
| Previously deferred Batch #1 FK finalized by M004 |     1 |
| Indexes, including PK/unique/partial indexes      |    56 |
| Command-specific RLS policies                     |    42 |
| Application triggers                              |    14 |

## 4. Verification results

| Verification                                                  | PostgreSQL 16 | PostgreSQL 17 | Evidence                                                           |
| ------------------------------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------ |
| Apply Batch #1 prerequisites then M004→M007 on empty database | PASS          | PASS          | Transactional migration runner completed                           |
| Replay M004→M007 on populated database                        | PASS          | PASS          | Catalog counts and behavioral tests remained stable                |
| Rollback guard without authorization                          | PASS          | PASS          | Rollback failed closed                                             |
| Authorized Batch #2 rollback                                  | PASS          | PASS          | All 14 Batch #2 tables removed                                     |
| Batch #1 preservation after rollback                          | PASS          | PASS          | `tenant.partners`, `iam.users`, `master_data.catalogs` remained    |
| FK integrity                                                  | PASS          | PASS          | 57 Batch #2 FKs; deliberate invalid contract/customer FK rejected  |
| Deferred branch FK finalization                               | PASS          | PASS          | Composite IAM branch-scope FK created by M004                      |
| Index creation                                                | PASS          | PASS          | 56 indexes present after apply and replay                          |
| RLS tenant isolation                                          | PASS          | PASS          | Own-customer visibility passed; cross-tenant asset insert rejected |
| Hard-delete denial                                            | PASS          | PASS          | Tenant DELETE returned zero rows because no DELETE policy exists   |
| Encryption storage constraints                                | PASS          | PASS          | Empty ciphertext and invalid digest length rejected                |
| `updated_at` trigger                                          | PASS          | PASS          | Branch timestamp advanced on update                                |
| Append-only trigger                                           | PASS          | PASS          | Asset status history UPDATE rejected                               |
| Shell syntax                                                  | PASS          | PASS          | `bash -n` passed                                                   |
| M008+ absence                                                 | PASS          | PASS          | No M008 or later migration found                                   |

Terminal completion markers:

```text
POSTGRES_16_BATCH2_PASS
POSTGRES_17_BATCH2_PASS
BATCH2_ALL_VERSIONS_PASS
```

## 5. RLS implementation

- All 14 Batch #2 tables have both ENABLE and FORCE RLS.
- Each table has separate SELECT, INSERT and UPDATE policies.
- Policies require `admin.authorized_partner(partner_id)`, which validates the trusted request claims and an active non-deleted IAM membership.
- No DELETE policy is created, preserving soft-retirement, effective-dating and append-only semantics.
- No Backend/API/JWT issuer was created.

## 6. Trigger coverage

- 12 mutable Batch #2 tables use `admin.set_updated_at()`.
- `asset.asset_inspections` and `asset.asset_status_history` use an append-only mutation blocker.
- Trigger count: 14.

## 7. Encryption boundary

The database enforces non-empty ciphertext, 32-byte lookup digest and positive key-version rules for Customer and Asset identifiers. Encryption/decryption and KMS remain outside SQL. No plaintext customer name, identifier, contact or address column was created.

## 8. Deferred cross-batch FKs

The following Asset relationships remain deferred because their target tables are prohibited in this batch:

1. `asset.assets.business_object_id → workflow.business_objects`
2. `asset.case_assets.(partner_id,case_id) → recovery.cases.(partner_id,id)`
3. `asset.asset_inspections.(partner_id,visit_id) → workforce.field_visits.(partner_id,id)`

The physical columns and indexes exist. No placeholder table, fake FK or M008+ object was created.

## 9. Rollback model

- M004–M007 are forward-only production migrations.
- `RB002_batch2.sql` is a guarded destructive rollback drill for pre-production verification only.
- It removes only Batch #2 objects, removes the branch FK finalized by M004 and preserves Batch #1.
- Production remediation must use a new compensating forward migration.

## 10. Review gate

```text
Migration Batch #1: APPROVED
Migration Batch #2 Implementation: COMPLETE
PostgreSQL 16 apply/replay/rollback: PASS
PostgreSQL 17 apply/replay/rollback: PASS
FK / Index / RLS / Encryption Storage / Trigger verification: PASS
M008 or later: NOT CREATED
Deployment: NOT PERFORMED
Batch #2 Review: APPROVED
```

Batch #2 was approved; Batch #3 is tracked separately.
