# PAYSAVE OS — Migration Batch #5 Report v1.0

> **Business capability:** Approval & Platform Services  
> **Scope:** M014 Approval, M015 Notification, M016 Platform only  
> **Prerequisites:** Migration Batches #1–#4 approved  
> **Status:** IMPLEMENTED AND VERIFIED — WAITING FOR REVIEW  
> **PostgreSQL:** 16 and 17  
> **Deployment:** Not performed

## 1. Delivered artifacts

| Artifact                | Path                                                        |
| ----------------------- | ----------------------------------------------------------- |
| M014 Approval           | `database/migrations/stage3_2_batch5/M014_approval.sql`     |
| M015 Notification       | `database/migrations/stage3_2_batch5/M015_notification.sql` |
| M016 Platform           | `database/migrations/stage3_2_batch5/M016_platform.sql`     |
| Rollback drill          | `database/rollbacks/stage3_2_batch5/RB005_batch5.sql`       |
| Verification SQL        | `database/tests/stage3_2_batch5_verify.sql`                 |
| PostgreSQL 16/17 runner | `database/tests/stage3_2_batch5_verify.sh`                  |

No M017 or later migration was created.

## 2. Implemented scope

- Tables: 15
  - Approval: 7
  - Notification/Communication: 5
  - Platform: 3
- Physical columns: 192
- Stage 3.1 comparison: 15/15 table column contracts match; no missing, extra or reordered physical columns.
- Approval lifecycle, notification queue/delivery, transactional outbox, idempotency registry and partner integration registry are included.
- M014–M016 are transactional, forward-only and replay-safe.

## 3. Catalog results

Counts observed identically after first apply and replay on PostgreSQL 16 and PostgreSQL 17:

| Object                                          | Count |
| ----------------------------------------------- | ----: |
| Batch #5 tables                                 |    15 |
| FKs owned by Batch #5 tables                    |    71 |
| Deferred prior-batch FKs finalized by M014/M016 |     9 |
| Indexes, including PK/unique/queue indexes      |    64 |
| Command-specific RLS policies                   |    45 |
| Application triggers                            |    17 |
| Partitioned notification queue/history parent   |     1 |

## 4. Verification results

| Verification                                | PostgreSQL 16 | PostgreSQL 17 | Evidence                                                        |
| ------------------------------------------- | ------------- | ------------- | --------------------------------------------------------------- |
| Apply approved Batches #1–#4 then M014→M016 | PASS          | PASS          | Empty disposable database completed                             |
| Replay M014→M016                            | PASS          | PASS          | Catalog counts and behavior remained stable                     |
| Rollback safety guard                       | PASS          | PASS          | Unauthorized destructive rollback failed closed                 |
| Authorized Batch #5 rollback                | PASS          | PASS          | Batch #5 tables/functions removed                               |
| Earlier-batch preservation                  | PASS          | PASS          | Workflow, Payment and Legal Hold roots remained                 |
| FK integrity                                | PASS          | PASS          | 71 Batch #5 FKs; invalid Approval Request parent rejected       |
| Approval Lifecycle                          | PASS          | PASS          | Policy/version/step/request/request-step/decision accepted      |
| Approval decision immutability              | PASS          | PASS          | Decision mutation rejected                                      |
| Notification Queue                          | PASS          | PASS          | Template/request/recipient/delivery accepted                    |
| Notification partition                      | PASS          | PASS          | Delivery row accepted by P01 parent/default partition           |
| Outbox publish transition                   | PASS          | PASS          | Attempts/published metadata update accepted                     |
| Outbox fact immutability                    | PASS          | PASS          | Event-type mutation rejected after persistence                  |
| Integration Registry                        | PASS          | PASS          | Encrypted partner integration accepted                          |
| Idempotency Registry                        | PASS          | PASS          | Request hash/key/expiry accepted                                |
| RLS tenant isolation                        | PASS          | PASS          | Own approval visible; cross-tenant notification insert rejected |
| Hard-delete denial                          | PASS          | PASS          | Integration DELETE returned zero rows                           |
| Shell syntax                                | PASS          | PASS          | `bash -n` passed                                                |
| M017+ absence                               | PASS          | PASS          | No M017 or later migration exists                               |

Terminal completion markers:

```text
POSTGRES_16_BATCH5_PASS
POSTGRES_17_BATCH5_PASS
BATCH5_ALL_VERSIONS_PASS
```

## 5. Approval lifecycle

M014 implements:

- policy identity and immutable published versions;
- ordered policy steps and quorum/timeouts;
- approval requests linked to Business Object and optional Workflow Instance;
- request-step execution state;
- append-only decisions with actor membership and evidence hash;
- effective-dated delegations.

M014 also finalizes seven Approval FKs deferred by Batch #4 across Finance, Performance and Legal Hold tables.

## 6. Notification queue

- Notification request uniqueness uses partner-scoped idempotency keys.
- Recipient destinations are ciphertext with 32-byte exact-lookup digest and positive key version.
- Delivery attempts use a monthly-range P01 table with a default partition.
- Queue/delivery rows retain tenant-aware Notification and Recipient FKs.
- No plaintext destination, sender credential or provider secret is stored.

## 7. Outbox controls

`platform.outbox_events` permits only operational updates to:

- `published_at`
- monotonic `attempts`
- update provenance fields

Aggregate, event, payload, schema, correlation, causation, idempotency and hash fact fields are immutable. DELETE is rejected. Both first publish and replay-safe verification passed.

## 8. Integration registry

- `platform.partner_integrations` stores provider/tenant metadata and encrypted configuration only.
- Key version is required; plaintext credentials are prohibited.
- M016 finalizes two prior relationships:
  - `master_data.external_mappings.integration_id`
  - `finance.provider_transactions.integration_id`
- The frozen reference alias `platform.integrations` is resolved to the actual approved table `platform.partner_integrations`; no additional table was created.

## 9. RLS and trigger model

- All 15 tables have ENABLE + FORCE RLS.
- Each table has separate SELECT, INSERT and UPDATE policies.
- No DELETE policy is defined.
- Trigger count: 17
  - 14 `updated_at` triggers
  - 1 append-only Approval Decision trigger
  - 1 published Approval Policy Version trigger
  - 1 specialized Outbox mutation guard

## 10. Deferred Event Catalog FKs

Two FKs remain deferred because Event Catalog is outside Batch #5:

1. `communication.notifications.event_version_id → event_catalog.event_versions`
2. `platform.outbox_events.event_version_id → event_catalog.event_versions`

Columns and indexes exist and comments record the deferral. No placeholder or M017+ table was created.

## 11. Rollback model

- M014–M016 are forward-only production migrations.
- `RB005_batch5.sql` is a guarded destructive rollback drill for pre-production only.
- It removes the nine prior-batch FKs finalized by this batch, then removes Batch #5 objects while preserving approved earlier batches.
- Production remediation requires a new compensating forward migration.

## 12. Review gate

```text
Migration Batches #1–#4: APPROVED
Migration Batch #5 Implementation: COMPLETE
PostgreSQL 16 apply/replay/rollback: PASS
PostgreSQL 17 apply/replay/rollback: PASS
Approval / Notification Queue / Outbox / Integration Registry: PASS
FK / RLS / Trigger verification: PASS
M017 or later: NOT CREATED
Deployment: NOT PERFORMED
Batch #5 Review: PENDING
```

Stop here and wait for review before any M017 work.
