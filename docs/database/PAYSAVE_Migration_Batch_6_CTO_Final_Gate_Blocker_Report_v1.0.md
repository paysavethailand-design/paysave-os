# PAYSAVE OS — Migration Batch #6 CTO Final-Gate Blocker Report v1.0

- **Prepared:** 2026-07-22 16:56:31 +07
- **Role:** Principal PostgreSQL Database Engineer
- **Requested scope:** M017 Event Catalog, M018 AI, M019 Report, M020 Seed
- **Decision:** **STOPPED BEFORE IMPLEMENTATION — CTO FINAL-GATE BLOCKED**
- **Deployment:** NOT PERFORMED
- **Production/Staging:** NOT ACCESSED

## 1. Executive decision

Migration Batch #6 was stopped before any M017–M020 production migration, rollback, or seed SQL was created. Mechanical comparison against the accepted 161-table Physical Schema Specification proved that approved M001–M016 contain only 114 canonical tables. The requested 22 Batch #6 tables would produce 136 tables, leaving 25 prior-contract tables absent.

Proceeding would make the requested clean-install, FK-integrity, AI cost-tracking, seed-integrity and Final Database Gate claims false. The Decision Owner selected the recommended action: stop and issue this blocker report.

## 2. Controls honored

- No Logical Architecture change
- No Physical Specification change
- No deployment
- No Production or Staging connection
- No application runtime, authentication, repository, session, JWT or RLS redesign
- No Homepage change
- No M017, M018, M019 or M020 migration file
- No destructive rollback executed
- No fabricated PostgreSQL 16/17 PASS report

Only two non-production preflight artifacts were created:

1. `database/tests/stage3_2_batch6_manifest.json` — frozen T124–T139 and T156–T161 contract, 22 tables / 235 columns.
2. `database/tests/stage3_2_batch6_verify.sh` — syntactically valid RED preflight runner that refuses to proceed while required artifacts are absent.

## 3. Mechanical catalog result

| Metric                                 |  Count |
| -------------------------------------- | -----: |
| Physical Specification tables          |    161 |
| Tables implemented by M001–M016        |    114 |
| Requested Batch #6 contract tables     |     22 |
| Maximum total after requested Batch #6 |    136 |
| Prior-contract omissions               | **25** |

### Missing prior-contract tables

**Audit (3)**

- T062 `audit.audit_events`
- T063 `audit.entity_history`
- T064 `audit.data_access_events`

**SLA (7)**

- T111 `sla.policies`
- T112 `sla.policy_versions`
- T113 `sla.targets`
- T114 `sla.instances`
- T115 `sla.pauses`
- T116 `sla.breaches`
- T117 `sla.escalations`

**Knowledge (6)**

- T118 `knowledge.spaces`
- T119 `knowledge.articles`
- T120 `knowledge.article_versions`
- T121 `knowledge.tags`
- T122 `knowledge.article_tags`
- T123 `knowledge.article_attachments`

**Warehouse (9)**

- T147 `warehouse.facilities`
- T148 `warehouse.zones`
- T149 `warehouse.bins`
- T150 `warehouse.receipts`
- T151 `warehouse.receipt_items`
- T152 `warehouse.stock_positions`
- T153 `warehouse.movements`
- T154 `warehouse.handovers`
- T155 `warehouse.disposition_orders`

Evidence: `docs/database/evidence/migration-batch6-blocker/01-physical-manifest-diff.log`.

## 4. Blocking dependency defects

### 4.1 M018 has an absent typed FK target

Physical T129 requires:

```text
ai.request_inputs.article_version_id
  -> knowledge.article_versions.id
```

`knowledge.article_versions` is T120 and is absent from M001–M016. M018 therefore cannot satisfy both the frozen FK contract and clean-install/FK-integrity requirements.

Deferring the FK would make Batch #6 partial, not Final, and would fail the requested FK Integrity deliverable.

### 4.2 AI Cost Tracking has no approved physical storage contract

T124–T132 have no approved token count, usage quantity, unit cost, currency, billed amount, pricing version or cost-ledger reference. M001–M016 also contain no approved AI usage/cost ledger target.

Adding such columns or a new table would change the Physical Specification, explicitly prohibited by the task. Omitting them would fail the stated AI Cost Tracking capability.

### 4.3 M020 tenant seed targets cannot be populated on a clean install

The requested targets have required tenant dependencies:

- `iam.roles.partner_id NOT NULL`
- `workflow.states.partner_id NOT NULL` and required `definition_version_id`
- `communication.notification_templates.partner_id NOT NULL`
- `master_data.catalogs.business_object_id NOT NULL`, finalized to tenant-scoped `workflow.business_objects`

A clean database has no authorized partner/onboarding context. Creating a hidden “system tenant” would introduce business data outside the allowed seed list and would be an unapproved architecture decision.

Global `iam.role_templates` and `iam.permissions` can be seeded, but that alone does not satisfy all five requested seed categories.

### 4.4 Invalid frozen index expression

T158 `event_catalog.payload_schemas` declares:

```text
IX keyset [id, created_at DESC, id DESC]
```

A PostgreSQL index cannot contain the same column twice. Choosing `[created_at DESC, id DESC]` would likely be technically correct but would constitute an unapproved correction to the Physical Specification.

### 4.5 Global-to-tenant compatibility approval reference

T161 `event_catalog.compatibility_reviews` is global/control-plane and has no `partner_id`, while `approval_request_id` points to tenant-scoped `approval.requests`. The schema cannot enforce same-tenant scope because the child has no tenant key. This coupling requires explicit Decision Owner acceptance or a Physical Amendment.

### 4.6 Split-scope RLS requires an approved policy contract

T159 `event_catalog.publishers` and T160 `event_catalog.subscriptions` allow nullable `partner_id`. They therefore need non-overlapping policies for global authority and tenant authority. Existing standard `admin.authorized_partner(partner_id)` policy alone cannot represent global rows. Implementing a new policy family without approval would alter the security contract.

## 5. Resolved findings that are not blockers

- The frozen alias `platform.integrations` was already resolved by approved Batch #5 to the actual table `platform.partner_integrations`; M017 should use the composite `(partner_id, id)` target if Batch #6 is later authorized.
- M017 must finalize prior deferred FKs from `communication.notifications.event_version_id` and `platform.outbox_events.event_version_id` to `event_catalog.event_versions`.
- P04 tables are treated by current approved migrations as initially unpartitioned/benchmark-gated. This report does not require an immediate partition implementation and does not adopt the independent reviewer's speculative partition-key change.

## 6. Required trigger and rollback controls for a future authorized batch

A future implementation must at minimum include:

- Published immutability: `event_catalog.event_versions`, `ai.prompt_versions`, `report.definition_versions`
- Append-only enforcement: `event_catalog.payload_schemas`, `event_catalog.compatibility_reviews`, `ai.results`, `ai.human_reviews`, `ai.feedback`, `report.runs`, `report.run_sources`, `report.snapshots`
- Reverse-order guarded rollback: M020 → M019 → M018 → M017
- Drop the two prior-table Event Catalog FKs before dropping `event_catalog.event_versions`
- Seed rollback that does not delete a permission already referenced by `iam.role_permissions`
- Separate global, tenant and split-scope RLS verification

## 7. RED preflight evidence

The preflight runner passed shell syntax validation and stopped at the first prohibited missing implementation artifact:

```text
syntax_exit_code=0
run_exit_code=1
BATCH6_RED_MISSING:database/migrations/stage3_2_batch6/M017_event_catalog.sql
```

This is the expected state after the stop decision. No PostgreSQL container was started by this run.

Evidence: `docs/database/evidence/migration-batch6-blocker/02-red-preflight.log`.

## 8. Independent review

Two independent no-edit reviews were requested:

- Claude CLI: completed and independently identified the missing Knowledge FK target, deferred Event FKs, split-scope RLS, invalid duplicate-column index, global-to-tenant approval coupling and seed rollback hazards.
- Antigravity CLI: completed in sandbox/no-edit mode after the initial read permission denial was corrected; it independently confirmed the missing Knowledge FK target, integration alias resolution need, Event FK finalization and rollback ordering.

The Principal Engineer mechanically rechecked all adopted findings. Speculative recommendations that would change the frozen Physical Contract were not adopted as implementation decisions.

## 9. Required CTO decisions before reopening Batch #6

1. Restore or formally remove the 25 omitted T062–T064, T111–T123 and T147–T155 contracts.
2. Approve an AI cost-accounting physical contract.
3. Approve a clean-install seed model for tenant-dependent defaults, or explicitly narrow M020 to global templates/catalogs only.
4. Correct T158's duplicate-column index contract.
5. Accept or redesign T161 global-to-tenant approval linkage.
6. Approve split-scope RLS semantics for T159/T160.
7. Issue a new authorization to implement M017–M020 after these decisions.

## 10. Final gate statement

```text
Migration Batches #1–#5: APPROVED (as stated by Decision Owner)
Local Database Verification for M001–M016: PASS (prior sprint)
Migration Batch #6 Implementation: NOT STARTED / BLOCKED
M017: NOT CREATED
M018: NOT CREATED
M019: NOT CREATED
M020: NOT CREATED
PostgreSQL 16 Batch #6 Report: NOT EXECUTED
PostgreSQL 17 Batch #6 Report: NOT EXECUTED
Migration Batch #6 Report: BLOCKER REPORT ISSUED
Deployment: NOT PERFORMED
Homepage: NOT MODIFIED
Next state: WAITING FOR CTO DATABASE FINAL GATE DECISIONS
```

**Stop here. Do not implement, deploy, or report PASS for Batch #6 until the CTO decisions in Section 9 are recorded.**
