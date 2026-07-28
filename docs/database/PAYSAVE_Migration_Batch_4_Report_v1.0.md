# PAYSAVE OS — Migration Batch #4 Report v1.0

> **Business capability:** Financial Operations  
> **Scope:** M011 Finance, M012 Performance, M013 Document only  
> **Prerequisites:** Migration Batches #1–#3 approved  
> **Status:** APPROVED by Decision Owner  
> **PostgreSQL:** 16 and 17  
> **Deployment:** Not performed

## 1. Delivered artifacts

| Artifact                | Path                                                       |
| ----------------------- | ---------------------------------------------------------- |
| M011 Finance            | `database/migrations/stage3_2_batch4/M011_finance.sql`     |
| M012 Performance        | `database/migrations/stage3_2_batch4/M012_performance.sql` |
| M013 Document           | `database/migrations/stage3_2_batch4/M013_document.sql`    |
| Rollback drill          | `database/rollbacks/stage3_2_batch4/RB004_batch4.sql`      |
| Verification SQL        | `database/tests/stage3_2_batch4_verify.sql`                |
| PostgreSQL 16/17 runner | `database/tests/stage3_2_batch4_verify.sh`                 |

No M014 or later migration was created.

## 2. Implemented scope

- Tables: 32
  - Finance: 9
  - Performance: 13
  - Document Store: 10
- Physical columns: 370
- Stage 3.1 comparison: 32/32 table column contracts match; no missing, extra or reordered physical columns.
- Payment, reconciliation, KPI, commission, attachment versions, scan evidence and legal holds are included.
- Two event/history parents use monthly range partitioning with default partitions.
- M011–M013 are transactional, forward-only and replay-safe.

## 3. Catalog results

Counts observed identically after first apply and replay on PostgreSQL 16 and PostgreSQL 17:

| Object                                                 | Count |
| ------------------------------------------------------ | ----: |
| Batch #4 tables                                        |    32 |
| Enforced PostgreSQL foreign keys                       |   167 |
| Indexes, including PK/unique/partial/partition indexes |   151 |
| Command-specific RLS policies                          |    96 |
| Application triggers                                   |    35 |
| Partitioned event/history parents                      |     2 |

## 4. Verification results

| Verification                                | PostgreSQL 16 | PostgreSQL 17 | Evidence                                                 |
| ------------------------------------------- | ------------- | ------------- | -------------------------------------------------------- |
| Apply approved Batches #1–#3 then M011→M013 | PASS          | PASS          | Empty disposable database completed                      |
| Replay M011→M013 on populated database      | PASS          | PASS          | Catalog counts and behavioral tests remained stable      |
| Rollback safety guard                       | PASS          | PASS          | Unauthorized destructive rollback failed closed          |
| Authorized Batch #4 rollback                | PASS          | PASS          | All Batch #4 tables/functions removed                    |
| Earlier-batch preservation                  | PASS          | PASS          | Partner, Case, Workflow and Assignment roots remained    |
| FK integrity                                | PASS          | PASS          | 167 FKs; invalid attachment-version parent rejected      |
| RLS tenant isolation                        | PASS          | PASS          | Own payment visible; cross-tenant status insert rejected |
| Hard-delete denial                          | PASS          | PASS          | Attachment DELETE returned zero rows                     |
| Payment                                     | PASS          | PASS          | Status, payment, business object and history accepted    |
| KPI                                         | PASS          | PASS          | Definition, version and partitioned KPI event accepted   |
| Commission                                  | PASS          | PASS          | Plan, version, run and immutable item accepted           |
| Document Version                            | PASS          | PASS          | Attachment and version/checksum relationship accepted    |
| Legal Hold                                  | PASS          | PASS          | Hold and attachment link accepted                        |
| Append-only                                 | PASS          | PASS          | Payment status history mutation rejected                 |
| Updated-at trigger                          | PASS          | PASS          | Payment timestamp advanced                               |
| Event partitions                            | PASS          | PASS          | Payment history and KPI event parents accepted rows      |
| Shell syntax                                | PASS          | PASS          | `bash -n` passed                                         |
| M014+ absence                               | PASS          | PASS          | No M014 or later migration exists                        |

Terminal completion markers:

```text
POSTGRES_16_BATCH4_PASS
POSTGRES_17_BATCH4_PASS
BATCH4_ALL_VERSIONS_PASS
```

## 5. Payment and mixed Master Data integrity

`finance.payments.payment_method_item_id` and `channel_item_id` reference mixed global/tenant Master Data. PostgreSQL direct FKs enforce parent existence; an additional trigger requires each selected item to be either global or owned by the payment partner. This avoids an invalid composite FK to nonexistent `catalog_items.partner_id` and blocks cross-partner references.

The trigger is replay-safe, included in rollback and counted in verification.

## 6. Event and immutable-fact model

Monthly-range partition parents:

1. `finance.payment_status_history` by `changed_at`
2. `performance.kpi_events` by `occurred_at`

Append-only triggers cover payment status history, reversals, KPI events, commission items, commission adjustments, commission payout history and attachment scan results.

Published KPI-definition and commission-plan versions receive an additional immutability trigger after `published_at` is set.

## 7. RLS and trigger model

- All 32 Batch #4 tables have ENABLE + FORCE RLS.
- Each table has separate SELECT, INSERT and UPDATE policies using active partner membership.
- No DELETE policy is defined.
- Trigger count: 35
  - 25 `updated_at` triggers
  - 7 append-only triggers
  - 2 published-version immutability triggers
  - 1 payment/catalog mixed-scope integrity trigger

## 8. Document and legal-hold controls

- Attachment metadata is separated from object versions.
- Every object version stores an object key, byte size and 32-byte SHA-256 checksum.
- Link tables provide typed Case, Visit, Payment, Commission and Asset relationships.
- Legal-hold records and legal-hold attachment links use RESTRICT semantics.
- The database contains metadata only; no binary object, signed URL, encryption key or plaintext secret is stored.

## 9. Deferred FKs

Eight approved relationships remain deferred because Approval and Platform Integration targets are outside Batch #4:

1. `finance.payment_reversals.approval_request_id → approval.requests`
2. `finance.reconciliation_batches.approval_request_id → approval.requests`
3. `finance.provider_transactions.integration_id → platform.integrations`
4. `performance.kpi_period_results.approval_request_id → approval.requests`
5. `performance.commission_runs.approval_request_id → approval.requests`
6. `performance.commission_adjustments.approval_request_id → approval.requests`
7. `performance.commission_payouts.approval_request_id → approval.requests`
8. `document_store.legal_holds.approved_request_id → approval.requests`

Columns and indexes exist, and migration comments record each deferral. No placeholder table or M014+ object was created.

## 10. Rollback model

- M011–M013 are forward-only production migrations.
- `RB004_batch4.sql` is a guarded destructive rollback drill for pre-production only.
- It removes Batch #4 objects and preserves approved prior batches.
- Production remediation requires a new compensating forward migration.

## 11. Review gate

```text
Migration Batches #1–#3: APPROVED
Migration Batch #4 Implementation: COMPLETE
PostgreSQL 16 apply/replay/rollback: PASS
PostgreSQL 17 apply/replay/rollback: PASS
Payment / Commission / KPI / Document Version / Legal Hold: PASS
FK / RLS / Trigger verification: PASS
M014 or later: NOT CREATED
Deployment: NOT PERFORMED
Batch #4 Review: APPROVED
```

Batch #4 was approved; Batch #5 is tracked separately.
