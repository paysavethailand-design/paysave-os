# PAYSAVE OS — Migration Batch #3 Report v1.0

> **Business capability:** Recovery Management  
> **Scope:** M008 Recovery, M009 Workflow, M010 Workforce only  
> **Prerequisites:** Migration Batches #1 and #2 approved  
> **Status:** APPROVED by Decision Owner  
> **PostgreSQL:** 16 and 17  
> **Deployment:** Not performed

## 1. Delivered artifacts

| Artifact                | Path                                                     |
| ----------------------- | -------------------------------------------------------- |
| M008 Recovery           | `database/migrations/stage3_2_batch3/M008_recovery.sql`  |
| M009 Workflow           | `database/migrations/stage3_2_batch3/M009_workflow.sql`  |
| M010 Workforce          | `database/migrations/stage3_2_batch3/M010_workforce.sql` |
| Rollback drill          | `database/rollbacks/stage3_2_batch3/RB003_batch3.sql`    |
| Verification SQL        | `database/tests/stage3_2_batch3_verify.sql`              |
| PostgreSQL 16/17 runner | `database/tests/stage3_2_batch3_verify.sh`               |

No M011 or later migration was created.

## 2. Implemented scope

- Tables: 37
  - Recovery: 9, excluding `recovery.contracts` already delivered by M006
  - Workflow: 9
  - Workforce: 19
- Physical columns: 428
- Stage 3.1 column-contract comparison: 37/37 tables match; no missing, extra or reordered physical columns.
- Event/timeline tables, assignment lifecycle and field-visit lifecycle are included.
- Four event tables use monthly-range partition parents with replay-safe default partitions.
- M008–M010 are transactional, forward-only and replay-safe.

## 3. Catalog results

Counts observed identically after first apply and replay on PostgreSQL 16 and PostgreSQL 17:

| Object                                         | Count |
| ---------------------------------------------- | ----: |
| Batch #3 logical parent tables                 |    37 |
| Enforced PostgreSQL foreign keys               |   204 |
| Indexes, including PK/unique/partition indexes |   184 |
| Command-specific RLS policies                  |   111 |
| Application triggers                           |    39 |
| Monthly-range partitioned event parents        |     4 |

## 4. Verification results

| Verification                                | PostgreSQL 16 | PostgreSQL 17 | Evidence                                                                      |
| ------------------------------------------- | ------------- | ------------- | ----------------------------------------------------------------------------- |
| Apply approved Batches #1/#2 then M008→M010 | PASS          | PASS          | Clean disposable database completed                                           |
| Replay M008→M010 on populated database      | PASS          | PASS          | Catalog and behavioral tests remained stable                                  |
| Rollback guard                              | PASS          | PASS          | Unapproved destructive rollback failed closed                                 |
| Authorized Batch #3 rollback                | PASS          | PASS          | Batch #3 tables/partitions/functions removed                                  |
| Prior-batch preservation                    | PASS          | PASS          | Partner, Customer, Contract and Asset roots remained                          |
| FK integrity                                | PASS          | PASS          | 204 FKs; invalid references rejected                                          |
| RLS                                         | PASS          | PASS          | Own-case visibility passed; cross-tenant status insert rejected               |
| Hard-delete denial                          | PASS          | PASS          | No DELETE policy; case deletion returned zero rows                            |
| Trigger                                     | PASS          | PASS          | Assignment `updated_at` advanced                                              |
| Append-only timeline                        | PASS          | PASS          | Case timeline UPDATE rejected                                                 |
| Event partitions                            | PASS          | PASS          | Four P01 parent tables and default partitions accepted event rows             |
| Location-event reference                    | PASS          | PASS          | Valid reference accepted; nonexistent reference rejected                      |
| Workflow                                    | PASS          | PASS          | Definition, version, state, instance and work item inserted with enforced FKs |
| Assignment                                  | PASS          | PASS          | Agent/status/case/business-object relationships accepted                      |
| Visit                                       | PASS          | PASS          | Visit, outcome, device, tracking and location event accepted                  |
| Shell syntax                                | PASS          | PASS          | `bash -n` passed                                                              |
| M011+ absence                               | PASS          | PASS          | No M011 or later migration exists                                             |

Terminal completion markers:

```text
POSTGRES_16_BATCH3_PASS
POSTGRES_17_BATCH3_PASS
BATCH3_ALL_VERSIONS_PASS
```

## 5. Event and timeline implementation

Monthly-range partition parents:

1. `recovery.case_status_history` by `changed_at`
2. `recovery.case_timeline_events` by `occurred_at`
3. `workforce.assignment_status_history` by `changed_at`
4. `workforce.field_location_events` by `occurred_at`

Each parent has a default partition so the migration can accept rows before an operational monthly-partition job is approved. Append-only triggers block UPDATE and DELETE on event/history facts.

Additional append-only tables include contract balance history, visit outcomes, anomalies, handoffs, contact attempts, promise status history and workflow instance history.

## 6. Recovery, Workflow, Assignment and Visit integrity

- Cases enforce same-partner Branch, Customer, optional Contract, Status and Workflow Business Object relationships.
- Workflow enforces definition/version/state/transition/instance/work-item relationships and tenant-aware role assignment.
- Assignments enforce Case, Agent, optional Team, Assignment Status and Business Object relationships.
- Visits enforce Assignment and Business Object relationships.
- M009 finalizes `asset.assets.business_object_id → workflow.business_objects`.
- M010 finalizes `asset.case_assets → recovery.cases` and `asset.asset_inspections → workforce.field_visits`.

## 7. Partition-safe location reference

PostgreSQL cannot create an ordinary FK from `workforce.location_anomalies.location_event_id` to the UUID alone because `field_location_events` is partitioned by `(occurred_at,id)`. No physical column was added or changed.

The implementation therefore uses:

- point index on the partitioned parent lookup path;
- append-only protection on the parent;
- a tenant-aware integrity trigger on anomaly INSERT/reference UPDATE;
- positive and negative verification tests.

This preserves the frozen logical relationship without creating a placeholder table or changing the 161-table model.

## 8. RLS and trigger model

- All 37 tables have ENABLE + FORCE RLS.
- Each table has separate SELECT, INSERT and UPDATE policies using `admin.authorized_partner(partner_id)`.
- No DELETE policy is defined.
- Trigger total: 39
  - 26 `updated_at` triggers
  - 11 append-only triggers
  - 1 published workflow-version immutability trigger
  - 1 partition-safe location-event reference trigger

## 9. Deferred cross-batch FK

One FK remains deferred because Event Catalog is outside Batch #3:

```text
recovery.case_timeline_events.event_version_id
→ event_catalog.event_versions.id
```

The column and index exist and the migration records the deferral. No M011+ table was created.

## 10. Rollback model

- M008–M010 are forward-only production migrations.
- `RB003_batch3.sql` is a guarded destructive rollback drill for pre-production only.
- It removes Batch #3 objects and the three prior-batch FKs finalized by this batch.
- It preserves approved Batch #1/#2 roots.
- Production remediation requires a new compensating forward migration.

## 11. Review gate

```text
Migration Batch #1: APPROVED
Migration Batch #2: APPROVED
Migration Batch #3 Implementation: COMPLETE
PostgreSQL 16 apply/replay/rollback: PASS
PostgreSQL 17 apply/replay/rollback: PASS
Recovery / Workflow / Workforce verification: PASS
Event / Timeline / Assignment / Visit verification: PASS
M011 or later: NOT CREATED
Deployment: NOT PERFORMED
Batch #3 Review: APPROVED
```

Batch #3 was approved; Batch #4 is tracked separately.
