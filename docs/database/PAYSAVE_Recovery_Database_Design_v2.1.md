# PAYSAVE OS — Stage 2.6 Logical Database Design Revision v2.1

> **Status:** Accepted and Frozen — Database Gate v2.1 / Architecture Freeze v1.0 2026-07-21  
> **Role:** Principal Database Architect  
> **Requirement:** Stage 2.5 Business Validation Report  
> **Scope:** Logical Database Design only  
> **Out of scope:** SQL, DDL, Migration, API, Frontend, Business Logic, runtime RLS/policy implementation

## Executive decision

PAYSAVE OS ใช้ PostgreSQL แบบ **shared database, shared schemas, tenant-isolated rows** โดย `partner_id` เป็น Tenant Boundary ของข้อมูลธุรกิจทุกตาราง ใช้ UUID เป็น Entity Key, ใช้ Tenant-aware FK, แยก Current State ออกจาก Append-only History/Timeline/Audit และ Partition เฉพาะตารางปริมาณสูง

Design target คือรองรับผู้ใช้มากกว่า 10,000 คนและเคสมากกว่า 10 ล้านเคส แต่การกล่าวว่า “รองรับใน Production แล้ว” ต้องผ่าน Load Test, Query-plan validation และ Capacity Test หลังมี SQL/Staging ใน Stage ถัดไป

## Stage 2.6 revision decision

Database Design v2.1 retains the 67-table baseline and adds **94 P0 entities**, producing **21 domains and 161 logical tables**. It closes Approval, AI, Report, Workflow, Knowledge, Asset, physical Warehouse custody, SLA, Master Data, Enterprise Event Catalog, plus P0 GPS/Visit/PTP, Reconciliation, Commission Payout, Document Safety/Legal Hold, Permission Scope and SoD gaps. P1-only expansion remains deferred.

`Warehouse` means **physical recovered-asset custody/storage**. Analytical outputs belong to Report; a future analytical warehouse is not designed here. This is an explicit Database Gate assumption.

### Cross-domain subject integrity

`workflow.business_objects` is a supertype identity. Each approval/workflow/SLA-capable aggregate root owns one unique `business_object_id`; Approval, Workflow, SLA, AI and Report reference that row. This avoids an unconstrained polymorphic subject reference while keeping cross-domain engines generic.

---

## สมมติฐานชั่วคราวที่ต้องอนุมัติ

1. `partner` คือ Tenant หลักและข้อมูล Customer/Contract/Case ไม่แชร์ข้าม Partner โดยอัตโนมัติ
2. User หนึ่งคนเป็นสมาชิกได้หลาย Partner และมีหลาย Role ในแต่ละ Partner
3. Branch เป็น Data Scope ภายใน Partner; ผู้ใช้หนึ่งคนเข้าถึงหลาย Branch ได้
4. Case ต้องมี Customer และอาจมี Contract ภายหลังสำหรับเคส Intake ที่ข้อมูลยังไม่ครบ
5. Payment หนึ่งรายการแบ่ง Allocation ไปได้หลาย Contract/Case และรองรับ Reversal โดยไม่แก้ไขรายการเดิม
6. Timeline เป็น Projection สำหรับแสดงเหตุการณ์ ไม่ใช่ Source of Truth ของยอดเงินหรือสถานะ
7. KPI/Commission เก็บ Definition Version และผลลัพธ์ แต่สูตรจริงยังไม่ถูกกำหนดใน Stage นี้
8. Binary Attachment อยู่ Private Object Storage; PostgreSQL เก็บ Metadata, Version และ Link เท่านั้น
9. Retention ของ GPS, Notification Delivery, Audit, History และ Attachment ยังรอ Business/Legal/Security Approval
10. เวลาทั้งหมดเก็บเป็น UTC `timestamptz`; เงินใช้ fixed precision พร้อม `currency_code` และห้ามใช้ floating point

---

# 1. Domain Catalog v2.1

| #   | Schema / Domain | Responsibility                                                                 | Tenant scope                      | Tables |
| --- | --------------- | ------------------------------------------------------------------------------ | --------------------------------- | ------ |
| 1   | tenant          | Tenant — Partner/Setting/Branch                                                | Partner                           | 3      |
| 2   | iam             | Identity & Access — User/RBAC/Scope/SoD                                        | Global user + Partner             | 10     |
| 3   | crm             | Customer — Customer identity/contact                                           | Partner                           | 4      |
| 4   | recovery        | Recovery — Contract/Case/Timeline                                              | Partner                           | 10     |
| 5   | workforce       | Workforce — Agent/Assignment/Visit/GPS/PTP                                     | Partner                           | 19     |
| 6   | finance         | Finance — Payment/Provider/Reconciliation/Dispute                              | Partner                           | 9      |
| 7   | performance     | Performance — KPI/Commission/Payout                                            | Partner                           | 13     |
| 8   | document_store  | Document — Attachment/Scan/Legal Hold/Typed links                              | Partner                           | 10     |
| 9   | communication   | Communication — Notification delivery                                          | Partner                           | 5      |
| 10  | audit           | Audit — Audit/History/Data access                                              | Partner + control plane           | 3      |
| 11  | platform        | Platform — Outbox/Idempotency/Integration                                      | Partner                           | 3      |
| 12  | master_data     | Master Data — Versioned controlled reference data                              | Global or Partner owner           | 5      |
| 13  | workflow        | Workflow — Definition/Instance/Task/Business Object                            | Partner                           | 9      |
| 14  | approval        | Approval — Policy/Request/Step/Decision/Delegation                             | Partner                           | 7      |
| 15  | sla             | SLA — Policy/Timer/Pause/Breach/Escalation                                     | Partner                           | 7      |
| 16  | knowledge       | Knowledge — Space/Article/Version/Evidence                                     | Partner                           | 6      |
| 17  | ai              | AI — Model/Prompt/Request/Result/HITL                                          | Global model + Partner workload   | 9      |
| 18  | report          | Report — Definition/Run/Lineage/Artifact/Snapshot                              | Partner                           | 7      |
| 19  | asset           | Asset — Physical asset/Ownership/Inspection/Status                             | Partner                           | 7      |
| 20  | warehouse       | Warehouse — Physical custody/Storage/Movement/Disposition                      | Partner                           | 9      |
| 21  | event_catalog   | Enterprise Event Catalog — Versioned event/schema/publisher/consumer contracts | Global + optional Partner binding | 6      |

**Count:** 21 domains; 161 logical tables.

---

# 2. ER Diagram

ERD แยกเป็นไฟล์ Mermaid เพื่อ Review ได้ง่าย:

- `docs/database/PAYSAVE_Recovery_ERD_v2.1.mmd`
- Rendered review artifact: `docs/database/PAYSAVE_Recovery_ERD_v2.1.svg`

ERD แสดง PK/FK และความสัมพันธ์ของ Aggregate หลัก โดย Table Catalog ในเอกสารนี้เป็น Source of Truth สำหรับรายการตารางทั้งหมด

---

# 3. Aggregate Map v2.1

| Aggregate                  | Root                                     | Children / records                                               | Invariant                             |
| -------------------------- | ---------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| Partner                    | tenant.partners                          | settings, branches                                               | tenant root                           |
| Membership/Role Grant      | iam.memberships / role_permissions       | roles, branch scopes, permission scopes                          | multi-role + SoD                      |
| Customer                   | crm.customers                            | identifiers, contacts, addresses                                 | PII tenant isolated                   |
| Contract                   | recovery.contracts                       | balance history                                                  | snapshots append-only                 |
| Case                       | recovery.cases                           | status, timeline, assignments, case-assets                       | same partner                          |
| Assignment                 | workforce.assignments                    | status, handoff, visits                                          | lineage preserved                     |
| Field Visit                | workforce.field_visits                   | outcome, participants, checklist, contact, tracking              | final evidence append-only            |
| Tracking Session           | workforce.tracking_sessions              | locations, anomalies                                             | device/legal basis bounded            |
| Promise to Pay             | workforce.promises_to_pay                | status history                                                   | due/amount lifecycle                  |
| Payment                    | finance.payments                         | allocation, provider facts, reversal, dispute                    | idempotent; corrections retained      |
| Reconciliation Batch       | finance.reconciliation_batches           | reconciliation items                                             | every match evidenced                 |
| KPI Definition             | performance.kpi_definitions              | versions, targets, events, results                               | published version immutable           |
| Commission Plan/Run        | performance.commission_plans             | versions, runs, items, adjustments                               | finalized result immutable            |
| Commission Payout          | performance.commission_payouts           | items, status history                                            | no duplicate active payout            |
| Attachment/Legal Hold      | document_store.attachments / legal_holds | versions, scans, typed links                                     | private binary; hold blocks disposal  |
| Notification               | communication.notifications              | recipients, deliveries                                           | attempts append-only                  |
| Master Data Catalog        | master_data.catalogs                     | versions, items, localization, mapping                           | published immutable                   |
| Workflow Definition        | workflow.definitions                     | versions, states, transitions                                    | published graph immutable             |
| Workflow Instance          | workflow.instances                       | work items, assignments, history                                 | current state + append-only history   |
| Approval Policy            | approval.policies                        | versions, policy steps                                           | published immutable                   |
| Approval Request           | approval.requests                        | request steps, decisions                                         | one subject; decisions immutable; SoD |
| SLA Policy                 | sla.policies                             | versions, targets                                                | published timers immutable            |
| SLA Instance               | sla.instances                            | pauses, breaches, escalations                                    | timer reconstructable                 |
| Knowledge Article          | knowledge.articles                       | versions, tags, attachments                                      | published hash immutable              |
| AI Model/Prompt            | ai.models / prompt_templates             | versions                                                         | approved versions retained            |
| AI Request                 | ai.requests                              | inputs, results, reviews, feedback                               | lineage + HITL                        |
| Report Definition          | report.definitions                       | versions, subscriptions                                          | no executable SQL                     |
| Report Run                 | report.runs                              | sources, artifacts, snapshots                                    | immutable lineage/export              |
| Asset                      | asset.assets                             | identifiers, ownership, case links, inspections, status          | custody reconstructable               |
| Warehouse Facility/Receipt | warehouse.facilities / receipts          | zones, bins, items, positions, movements, handovers, disposition | movement is custody source            |
| Event Definition           | event_catalog.event_definitions          | versions, schemas, publishers, subscriptions, reviews            | contract immutable                    |

Cross-cutting Audit/Entity History/Data Access/Outbox records survive source retirement and are not cascade-deleted children.

---

# 4. Entity Standards

## UUID Primary Key

- Entity ทุกตัวมี `id uuid`
- แนะนำ UUIDv7 เพื่อให้ B-tree มี locality ดีกว่า UUIDv4; Generator ต้องได้รับอนุมัติใน Stage SQL
- ตารางไม่ Partition ใช้ `id` เป็น Primary Key
- Tenant-owned table ที่ไม่ Partition ต้องมี Candidate Key แบบ Unique `(partner_id, id)` เพิ่ม เพื่อให้ Child สร้าง Tenant-aware FK ได้จริง
- ตาราง Partition ใช้ Composite Primary Key ที่ประกอบด้วย Partition Key และ UUID เช่น `(partner_id, id)` หรือ `(occurred_at, id)` เพราะ PostgreSQL บังคับ Unique/Primary Key ให้รวม Partition Key
- UUID ยังคงเป็น Entity Identifier; Composite Key เป็น Physical Integrity Requirement ของ PostgreSQL

## Tenant-owned columns

ตารางข้อมูล Partner ต้องมีอย่างน้อย:

- `id`
- `partner_id`
- `created_at`, `created_by`
- `updated_at`, `updated_by` สำหรับ Mutable Entity
- `deleted_at`, `deleted_by`, `delete_reason` สำหรับ Soft-deletable Entity
- `version_no` สำหรับ Optimistic Concurrency ใน Aggregate Root ที่มีการแก้ไขพร้อมกันสูง

## Soft Delete

ใช้กับ Master/Current-state Entity เช่น Partner, Branch, Membership, Role, Customer, Contract, Case, Agent, Team, Assignment, Visit, Attachment และ Notification Template

ไม่ใช้ Soft Delete กับ Append-only Table เช่น Status History, Timeline, Audit, Entity History, Location Event, KPI Event, Payment Reversal และ Notification Delivery; ใช้ Retention/Archive Policy แทน

## Money, time and payload

- Money: fixed precision + `currency_code`
- Time: `timestamptz` UTC
- Business date/period: `date`
- JSONB ใช้เฉพาะ extensible metadata/event snapshot ที่มี Schema Version; ไม่ใช้แทน Relational Column ที่ต้อง Query/FK
- PII-sensitive identifier แยก encrypted value และ deterministic hash; Algorithm/KMS รอ Security Design

---

# 5. Table Catalog v2.1 — 161 Tables

The first 67 rows are the retained v2.0 baseline. Section 5B adds 94 P0 rows; no baseline entity is removed.

## 5A. Retained baseline — 67 tables

## A. Tenant — 3 tables

| Table                     | Purpose                    | Important fields                                                           | Main FK / rule                                               |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `tenant.partners`         | Tenant root                | id, code, name, status, timezone, default_currency                         | code unique; soft delete                                     |
| `tenant.partner_settings` | Versioned partner settings | id, partner_id, setting_key, value_json, schema_version, effective_from/to | partner_id → partners; key+effective_from unique per partner |
| `tenant.branches`         | Branch/data scope          | id, partner_id, code, name, status                                         | partner_id → partners; active code unique per partner        |

## B. Identity & Access — 8 tables

| Table                          | Purpose                       | Important fields                                       | Main FK / rule                                                   |
| ------------------------------ | ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| `iam.users`                    | Global user/profile reference | id, auth_subject, display_name, status, last_seen_at   | auth_subject unique; no partner_id                               |
| `iam.memberships`              | User membership in partner    | id, partner_id, user_id, employee_code, status         | partner → partners; user → users; active user unique per partner |
| `iam.role_templates`           | Global role blueprint         | id, code, name, version_no                             | code+version unique                                              |
| `iam.roles`                    | Partner-owned role            | id, partner_id, template_id, code, name, status        | partner; optional template; active code unique per partner       |
| `iam.permissions`              | Stable permission catalog     | id, code, resource, action                             | code unique                                                      |
| `iam.role_permissions`         | Role-permission link          | id, partner_id, role_id, permission_id, effect         | tenant-aware role FK; unique role+permission                     |
| `iam.membership_roles`         | Multi-role assignment         | id, partner_id, membership_id, role_id, valid_from/to  | both parent rows must share partner; unique active assignment    |
| `iam.membership_branch_scopes` | Branch access scope           | id, partner_id, membership_id, branch_id, access_level | membership/branch same partner; unique membership+branch         |

## C. Customer — 4 tables

| Table                      | Purpose                       | Important fields                                                                   | Main FK / rule                                               |
| -------------------------- | ----------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `crm.customers`            | Person/organization master    | id, partner_id, customer_type, display_name, normalized_name, status               | partner; external customer ref partial unique; soft delete   |
| `crm.customer_identifiers` | National/external identifiers | id, partner_id, customer_id, identifier_type, value_encrypted, value_hash          | tenant-aware customer FK; type+hash unique among active rows |
| `crm.customer_contacts`    | Phone/email/contact           | id, partner_id, customer_id, contact_type, value_encrypted, value_hash, is_primary | tenant-aware customer FK; one primary per type               |
| `crm.customer_addresses`   | Customer addresses/geocode    | id, partner_id, customer_id, address_type, address_encrypted, latitude, longitude  | tenant-aware customer FK; PII access audited                 |

## D. Recovery — 10 tables

| Table                               | Purpose                          | Important fields                                                                                                               | Main FK / rule                                                                  |
| ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `recovery.contracts`                | Recoverable account/contract     | id, partner_id, customer_id, external_ref, principal_amount, outstanding_amount, currency_code, status                         | customer same partner; active external_ref unique per partner                   |
| `recovery.contract_balance_history` | Immutable balance snapshots      | id, partner_id, contract_id, balance, effective_at, source_ref                                                                 | contract same partner; append-only                                              |
| `recovery.case_statuses`            | Partner-specific status catalog  | id, partner_id, code, name, category, is_terminal, sort_order                                                                  | active code unique per partner                                                  |
| `recovery.cases`                    | Main recovery case               | id, partner_id, branch_id, customer_id, contract_id, status_id, priority, opened_at, next_action_at, closed_at, version_no     | all references tenant-aware; soft delete; partition decision is benchmark-gated |
| `recovery.case_external_references` | Source-system references         | id, partner_id, case_id, source_system, external_ref                                                                           | case same partner; source+ref unique per partner                                |
| `recovery.case_status_history`      | Status transitions               | id, partner_id, case_id, from_status_id, to_status_id, changed_at, changed_by, reason_code                                     | case/statuses same partner; append-only monthly partition                       |
| `recovery.case_timeline_events`     | Unified case timeline projection | id, partner_id, case_id, event_type, occurred_at, actor_user_id, source_type, source_id, summary, payload_json, schema_version | case same partner; append-only monthly partition                                |
| `recovery.case_notes`               | Operational notes                | id, partner_id, case_id, visibility, note_text_encrypted, created_by                                                           | case same partner; soft delete permitted with audit                             |
| `recovery.tags`                     | Partner tag catalog              | id, partner_id, code, label, color_token                                                                                       | active code unique per partner                                                  |
| `recovery.case_tags`                | Case-tag link                    | id, partner_id, case_id, tag_id                                                                                                | both same partner; unique case+tag                                              |

## E. Workforce — 9 tables

| Table                                 | Purpose                           | Important fields                                                                                     | Main FK / rule                                                             |
| ------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `workforce.agents`                    | Field-agent profile               | id, partner_id, membership_id, home_branch_id, status                                                | membership/branch same partner; one agent per membership                   |
| `workforce.teams`                     | Operational team                  | id, partner_id, branch_id, code, name, status                                                        | branch same partner; active code unique                                    |
| `workforce.team_members`              | Team membership history           | id, partner_id, team_id, agent_id, valid_from/to, is_lead                                            | team/agent same partner; unique active membership                          |
| `workforce.assignment_statuses`       | Partner assignment status catalog | id, partner_id, code, category, is_terminal                                                          | active code unique per partner                                             |
| `workforce.assignments`               | Case assignment                   | id, partner_id, case_id, agent_id, team_id, status_id, assigned_at, due_at, completed_at, version_no | all same partner; active uniqueness; partition decision is benchmark-gated |
| `workforce.assignment_status_history` | Assignment transitions            | id, partner_id, assignment_id, from_status_id, to_status_id, changed_at, changed_by                  | append-only monthly partition                                              |
| `workforce.field_visits`              | Field visit record                | id, partner_id, assignment_id, scheduled_at, started_at, completed_at, outcome_code, version_no      | assignment same partner; soft delete only before finalization              |
| `workforce.field_visit_outcomes`      | Structured visit outcome details  | id, partner_id, visit_id, outcome_type, payload_json, schema_version                                 | visit same partner; append-only after finalization                         |
| `workforce.field_location_events`     | GPS/location trail                | id, partner_id, visit_id, agent_id, occurred_at, latitude, longitude, accuracy_meters                | visit/agent same partner; append-only monthly partition                    |

## F. Finance — 6 tables

| Table                            | Purpose                           | Important fields                                                                                                        | Main FK / rule                                                        |
| -------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `finance.payment_statuses`       | Partner payment status catalog    | id, partner_id, code, category, is_terminal                                                                             | active code unique per partner                                        |
| `finance.payments`               | Payment receipt/transaction       | id, partner_id, customer_id, status_id, external_ref, idempotency_key, amount, currency_code, received_at, confirmed_at | customer/status same partner; external_ref/idempotency partial unique |
| `finance.payment_allocations`    | Allocate payment to contract/case | id, partner_id, payment_id, contract_id, case_id, allocated_amount                                                      | all same partner; contract required; case optional                    |
| `finance.payment_status_history` | Payment transition history        | id, partner_id, payment_id, from_status_id, to_status_id, changed_at, changed_by                                        | append-only monthly partition                                         |
| `finance.payment_reversals`      | Immutable reversal                | id, partner_id, payment_id, reversal_ref, amount, reason_code, reversed_at, reversed_by                                 | payment same partner; reversal_ref unique per partner                 |
| `finance.reconciliation_batches` | Group reconciliation work         | id, partner_id, period_start/end, status, source_ref, total_amount, finalized_at                                        | partner; unique source_ref per partner                                |

## G. Performance — 10 tables

| Table                                  | Purpose                        | Important fields                                                                                             | Main FK / rule                                         |
| -------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `performance.kpi_definitions`          | KPI identity                   | id, partner_id, code, name, status                                                                           | active code unique per partner                         |
| `performance.kpi_definition_versions`  | Versioned KPI config           | id, partner_id, definition_id, version_no, metric_schema_json, effective_from/to, published_at               | immutable after published; unique definition+version   |
| `performance.kpi_targets`              | Target by agent/team/period    | id, partner_id, definition_version_id, agent_id, team_id, period_start/end, target_value                     | exactly one target subject; same partner               |
| `performance.kpi_events`               | Append-only metric inputs      | id, partner_id, definition_version_id, agent_id, case_id, event_type, occurred_at, value_numeric, source_ref | same partner; monthly partition; source_ref idempotent |
| `performance.kpi_period_results`       | Frozen period result           | id, partner_id, definition_version_id, agent_id, period_start/end, result_value, calculated_at, finalized_at | unique definition+agent+period                         |
| `performance.commission_plans`         | Commission plan identity       | id, partner_id, code, name, status                                                                           | active code unique per partner                         |
| `performance.commission_plan_versions` | Versioned commission config    | id, partner_id, plan_id, version_no, rule_schema_json, effective_from/to, published_at                       | immutable after published                              |
| `performance.commission_runs`          | Calculation/finalization batch | id, partner_id, plan_version_id, period_start/end, status, started_at, finalized_at                          | unique plan version+period+run version                 |
| `performance.commission_items`         | Result per agent/source        | id, partner_id, run_id, agent_id, case_id, payment_id, base_amount, commission_amount, currency_code, status | same partner; immutable after run finalized            |
| `performance.commission_adjustments`   | Explicit correction            | id, partner_id, commission_item_id, amount, reason_code, approved_by, approved_at                            | append-only; no overwrite of original item             |

## H. Document Store — 6 tables

| Table                                   | Purpose                     | Important fields                                                                                             | Main FK / rule                                          |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `document_store.attachments`            | Logical attachment metadata | id, partner_id, category, filename, media_type, classification, current_version_no, status                   | partner; soft delete; no binary content                 |
| `document_store.attachment_versions`    | Immutable object versions   | id, partner_id, attachment_id, version_no, object_key, size_bytes, checksum_sha256, uploaded_by, uploaded_at | object_key/checksum metadata; unique attachment+version |
| `document_store.case_attachments`       | Case-document explicit link | id, partner_id, case_id, attachment_id, purpose                                                              | both same partner; unique link                          |
| `document_store.visit_attachments`      | Visit evidence link         | id, partner_id, visit_id, attachment_id, purpose                                                             | both same partner; unique link                          |
| `document_store.payment_attachments`    | Payment evidence link       | id, partner_id, payment_id, attachment_id, purpose                                                           | both same partner; unique link                          |
| `document_store.commission_attachments` | Commission evidence link    | id, partner_id, commission_item_id, attachment_id, purpose                                                   | both same partner; unique link                          |

## I. Communication — 5 tables

| Table                                    | Purpose                      | Important fields                                                                                                      | Main FK / rule                                                  |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `communication.notification_templates`   | Partner/channel template     | id, partner_id, code, channel, locale, version_no, status                                                             | code+channel+locale+version unique                              |
| `communication.notification_preferences` | User channel preference      | id, partner_id, membership_id, channel, enabled, quiet_hours                                                          | membership same partner; unique membership+channel              |
| `communication.notifications`            | Logical notification request | id, partner_id, template_id, event_type, idempotency_key, priority, scheduled_at, status, payload_json                | idempotency unique per partner; soft cancel, not hard delete    |
| `communication.notification_recipients`  | Recipient mapping            | id, partner_id, notification_id, membership_id, destination_encrypted, destination_hash                               | notification/membership same partner                            |
| `communication.notification_deliveries`  | Delivery attempts            | id, partner_id, notification_id, recipient_id, channel, attempt_no, provider_ref, status, attempted_at, next_retry_at | append-only monthly partition; unique recipient+channel+attempt |

## J. Audit — 3 tables

| Table                      | Purpose                     | Important fields                                                                                                               | Main FK / rule                                                                           |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `audit.audit_events`       | Security/business audit     | id, partner_id, actor_user_id, action, entity_type, entity_id, request_id, occurred_at, before_hash, after_hash, metadata_json | append-only monthly partition; actor optional for system                                 |
| `audit.entity_history`     | Reconstruct entity changes  | id, partner_id, entity_type, entity_id, entity_version, operation, snapshot_or_patch_json, occurred_at, actor_user_id          | append-only; hash by entity identity; unique partner+type+entity+version across all time |
| `audit.data_access_events` | Sensitive-data access audit | id, partner_id, actor_user_id, data_classification, entity_type, entity_id, purpose_code, occurred_at                          | append-only monthly partition                                                            |

Audit tables intentionally do not FK ไปยังทุก Entity เพราะต้องคงหลักฐานได้แม้ Source ถูก Archive และหลีกเลี่ยง FK graph ที่ผูกทุก Domain; เก็บ immutable identifier + type + digest แทน

## K. Platform — 3 tables

| Table                           | Purpose                             | Important fields                                                                                                            | Main FK / rule                                                          |
| ------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `platform.outbox_events`        | Transactional event handoff         | id, partner_id, aggregate_type, aggregate_id, event_type, payload_json, schema_version, occurred_at, published_at, attempts | append-only; idempotent publish; monthly partitionเมื่อ volume ถึงเกณฑ์ |
| `platform.idempotency_keys`     | Duplicate-command protection        | id, partner_id, scope, idempotency_key, request_hash, response_ref, expires_at                                              | scope+key unique per partner; retention controlled                      |
| `platform.partner_integrations` | Partner integration config metadata | id, partner_id, provider_code, external_tenant_ref, status, config_encrypted, key_version                                   | partner; secret material encrypted; no plaintext credential             |

---

## 5B. Stage 2.6 P0 additions — 94 tables

### Identity & Access additions — 2 tables

| Table                          | Purpose                                    | Important logical fields                                                                                  | Relationship / invariant                                         | Aggregate  |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `iam.permission_scopes`        | Resource/data scope on a role grant        | id, partner_id, role_permission_id, scope_type, scope_ref_id, data_classification, valid_from/to          | grant/scope same partner; normalized one row per scope dimension | Role Grant |
| `iam.separation_of_duty_rules` | Maker-checker and incompatible-duty policy | id, partner_id, code, subject_kind, maker_permission_id, checker_permission_id, status, effective_from/to | permission pair versioned by effective dates; active code unique | SoD Rule   |

### Workforce additions — 10 tables

| Table                                     | Purpose                          | Important logical fields                                                                                        | Relationship / invariant                                              | Aggregate        |
| ----------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------- |
| `workforce.agent_devices`                 | Registered agent device          | id, partner_id, agent_id, device_fingerprint_hash, platform, status, bound_at, revoked_at                       | agent same partner; active fingerprint unique per partner             | Agent            |
| `workforce.tracking_sessions`             | Bounded GPS collection session   | id, partner_id, visit_id, agent_id, device_id, legal_basis_code, consent_ref, started_at, ended_at, status      | visit/agent/device same partner; one active session per device policy | Tracking Session |
| `workforce.geofences`                     | Partner field-operation boundary | id, partner_id, code, name, boundary_ref, status, effective_from/to                                             | active code unique; physical geometry strategy deferred               | Geofence         |
| `workforce.location_anomalies`            | GPS quality/spoof exception      | id, partner_id, tracking_session_id, location_event_id, anomaly_type, score, review_status, reviewed_by         | finding append-only; review audited                                   | Tracking Session |
| `workforce.assignment_handoffs`           | Immutable reassignment lineage   | id, partner_id, assignment_id, from_agent_id, to_agent_id, reason_code, occurred_at, actor_user_id              | assignment/agents same partner; append-only                           | Assignment       |
| `workforce.visit_participants`            | People present in a visit        | id, partner_id, visit_id, participant_type, customer_id, membership_id, display_ref, acknowledged_at            | typed participant requires matching typed FK                          | Field Visit      |
| `workforce.visit_checklist_responses`     | Versioned checklist evidence     | id, partner_id, visit_id, item_code, checklist_version, response_value, recorded_at, recorded_by                | unique visit+version+item; append-only after finalization             | Field Visit      |
| `workforce.contact_attempts`              | Structured contact attempt       | id, partner_id, visit_id, customer_contact_id, channel_code, outcome_code, occurred_at, actor_membership_id     | visit/contact/actor same partner; append-only                         | Field Visit      |
| `workforce.promises_to_pay`               | Customer payment commitment      | id, partner_id, case_id, visit_id, customer_id, promised_amount, currency_code, due_at, status_code, version_no | case/visit/customer same partner; amount positive                     | Promise to Pay   |
| `workforce.promise_to_pay_status_history` | Promise lifecycle transitions    | id, partner_id, promise_id, from_status_code, to_status_code, changed_at, changed_by, reason_code               | promise same partner; append-only                                     | Promise to Pay   |

### Finance additions — 3 tables

| Table                           | Purpose                              | Important logical fields                                                                                                 | Relationship / invariant                                                 | Aggregate            |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | -------------------- |
| `finance.provider_transactions` | External provider transaction ledger | id, partner_id, payment_id, integration_id, provider_ref, direction, amount, currency_code, status_code, occurred_at     | provider_ref unique per partner/provider; payment optional until matched | Payment              |
| `finance.reconciliation_items`  | Payment match result in a batch      | id, partner_id, batch_id, payment_id, provider_transaction_id, match_status, matched_amount, exception_code, reviewed_by | batch plus source same partner; unique batch/source pair                 | Reconciliation Batch |
| `finance.payment_disputes`      | Dispute/chargeback lifecycle         | id, partner_id, payment_id, provider_transaction_id, reason_code, status_code, opened_at, resolved_at, version_no        | payment/provider transaction same partner                                | Payment Dispute      |

### Performance additions — 3 tables

| Table                                          | Purpose                       | Important logical fields                                                                                                                                | Relationship / invariant                                   | Aggregate         |
| ---------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ----------------- |
| `performance.commission_payouts`               | Commission disbursement batch | id, partner_id, commission_run_id, currency_code, total_amount, status_code, scheduled_at, paid_at, version_no, business_object_id, approval_request_id | run same partner; unique payout version per run/currency   | Commission Payout |
| `performance.commission_payout_items`          | Payout lines                  | id, partner_id, payout_id, commission_item_id, agent_id, amount                                                                                         | all same partner; item paid once per active payout version | Commission Payout |
| `performance.commission_payout_status_history` | Payout transitions            | id, partner_id, payout_id, from_status_code, to_status_code, changed_at, changed_by, reason_code                                                        | payout same partner; append-only                           | Commission Payout |

### Document additions — 4 tables

| Table                                    | Purpose                          | Important logical fields                                                                                     | Relationship / invariant                     | Aggregate  |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | ---------- |
| `document_store.attachment_scan_results` | Malware/content scan evidence    | id, partner_id, attachment_version_id, scanner_code, signature_version, status_code, scanned_at, result_hash | attachment version same partner; append-only | Attachment |
| `document_store.legal_holds`             | Retention hold authority         | id, partner_id, hold_ref, reason_code, authority_ref, status_code, effective_from/to, approved_request_id    | hold ref unique; release requires approval   | Legal Hold |
| `document_store.legal_hold_attachments`  | Explicit hold-to-attachment link | id, partner_id, legal_hold_id, attachment_id, applied_at, released_at                                        | both same partner; active link unique        | Legal Hold |
| `document_store.asset_attachments`       | Explicit asset evidence link     | id, partner_id, asset_id, attachment_id, purpose_code                                                        | both same partner; unique active link        | Asset      |

### Master Data additions — 5 tables

| Table                                    | Purpose                            | Important logical fields                                                              | Relationship / invariant                              | Aggregate           |
| ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------- |
| `master_data.catalogs`                   | Controlled reference-data identity | id, owner_partner_id, code, name, scope_type, status, business_object_id              | global or one partner owner; code unique within scope | Master Data Catalog |
| `master_data.catalog_versions`           | Published catalog version          | id, owner_partner_id, catalog_id, version_no, effective_from/to, status, published_at | published version immutable                           | Master Data Catalog |
| `master_data.catalog_items`              | Versioned code/value entry         | id, owner_partner_id, catalog_version_id, code, label, sort_order, status             | code unique within catalog version                    | Master Data Catalog |
| `master_data.catalog_item_localizations` | Localized item label               | id, owner_partner_id, catalog_item_id, locale, label, description                     | locale unique per item                                | Master Data Catalog |
| `master_data.external_mappings`          | External code mapping              | id, partner_id, catalog_item_id, integration_id, external_code, effective_from/to     | integration same partner; active mapping unique       | Master Data Catalog |

### Workflow additions — 9 tables

| Table                            | Purpose                              | Important logical fields                                                                                                  | Relationship / invariant                                     | Aggregate           |
| -------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------- |
| `workflow.business_objects`      | Stable cross-domain subject identity | id, partner_id, object_kind, registered_at, retired_at                                                                    | domain root owns unique tenant-aware business_object_id      | Business Object     |
| `workflow.definitions`           | Workflow identity                    | id, partner_id, code, name, subject_kind, status, business_object_id                                                      | active code unique per partner                               | Workflow Definition |
| `workflow.definition_versions`   | Workflow configuration version       | id, partner_id, definition_id, version_no, effective_from/to, status, published_at                                        | published version immutable                                  | Workflow Definition |
| `workflow.states`                | States in a workflow version         | id, partner_id, definition_version_id, code, category, is_initial, is_terminal                                            | code unique per version; initial-state policy                | Workflow Definition |
| `workflow.transitions`           | Allowed state transition             | id, partner_id, definition_version_id, from_state_id, to_state_id, action_code, permission_code                           | states same version/partner; transition unique               | Workflow Definition |
| `workflow.instances`             | Running process for one subject      | id, partner_id, definition_version_id, business_object_id, current_state_id, status, started_at, completed_at, version_no | subject/definition same partner; active uniqueness by policy | Workflow Instance   |
| `workflow.work_items`            | Human/system task                    | id, partner_id, instance_id, state_id, task_type, status, due_at, completed_at, version_no                                | instance/state same partner/version                          | Workflow Instance   |
| `workflow.work_item_assignments` | Task assignee history                | id, partner_id, work_item_id, membership_id, role_id, assigned_at, released_at                                            | task/member/role same partner; effective-dated               | Workflow Instance   |
| `workflow.instance_history`      | Workflow/task transition log         | id, partner_id, instance_id, work_item_id, from_state_id, to_state_id, event_code, occurred_at, actor_user_id             | append-only; idempotent source event                         | Workflow Instance   |

### Approval additions — 7 tables

| Table                      | Purpose                             | Important logical fields                                                                                                                                                           | Relationship / invariant                                          | Aggregate           |
| -------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------- |
| `approval.policies`        | Approval policy identity            | id, partner_id, code, name, subject_kind, status, business_object_id                                                                                                               | active code unique per partner                                    | Approval Policy     |
| `approval.policy_versions` | Approval policy version             | id, partner_id, policy_id, version_no, mode, quorum, effective_from/to, published_at                                                                                               | published version immutable                                       | Approval Policy     |
| `approval.policy_steps`    | Sequential/parallel step definition | id, partner_id, policy_version_id, step_no, step_code, approver_scope, required_count, timeout_minutes                                                                             | step unique per version                                           | Approval Policy     |
| `approval.requests`        | Approval process for one subject    | id, partner_id, policy_version_id, business_object_id, workflow_instance_id, requested_by, status, requested_at, decided_at, version_no, subject_version_ref, subject_version_hash | subject/policy/workflow same partner; active uniqueness by policy | Approval Request    |
| `approval.request_steps`   | Runtime approval step               | id, partner_id, request_id, policy_step_id, status, due_at, completed_at                                                                                                           | request/policy step same version and partner                      | Approval Request    |
| `approval.decisions`       | Immutable approver decision         | id, partner_id, request_step_id, actor_membership_id, decision_code, reason_code, decided_at, evidence_hash                                                                        | actor/step same partner; append-only; SoD                         | Approval Request    |
| `approval.delegations`     | Approval delegation                 | id, partner_id, from_membership_id, to_membership_id, permission_id, effective_from/to, reason_code, approved_request_id                                                           | same partner; no self/cyclic active delegation                    | Approval Delegation |

### SLA additions — 7 tables

| Table                 | Purpose               | Important logical fields                                                                                                | Relationship / invariant                         | Aggregate    |
| --------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------ |
| `sla.policies`        | SLA policy identity   | id, partner_id, code, name, subject_kind, status, business_object_id                                                    | active code unique per partner                   | SLA Policy   |
| `sla.policy_versions` | SLA policy version    | id, partner_id, policy_id, version_no, calendar_code, effective_from/to, published_at                                   | published version immutable                      | SLA Policy   |
| `sla.targets`         | Named target timer    | id, partner_id, policy_version_id, target_code, start_event_code, stop_event_code, duration_seconds, severity           | target unique per policy version                 | SLA Policy   |
| `sla.instances`       | Running SLA timer     | id, partner_id, target_id, business_object_id, workflow_instance_id, started_at, due_at, stopped_at, status, version_no | target/subject/workflow same partner             | SLA Instance |
| `sla.pauses`          | SLA pause interval    | id, partner_id, sla_instance_id, reason_code, paused_at, resumed_at, actor_user_id                                      | instance same partner; non-overlap policy        | SLA Instance |
| `sla.breaches`        | Immutable breach fact | id, partner_id, sla_instance_id, breached_at, overdue_seconds, acknowledged_at, acknowledged_by                         | append-only; occurrence uniqueness by target     | SLA Instance |
| `sla.escalations`     | SLA escalation action | id, partner_id, sla_instance_id, level_no, workflow_instance_id, notification_id, escalated_at, status                  | linked records same partner; append-only attempt | SLA Instance |

### Knowledge additions — 6 tables

| Table                           | Purpose                                | Important logical fields                                                                                     | Relationship / invariant                               | Aggregate         |
| ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------- |
| `knowledge.spaces`              | Knowledge security/publishing boundary | id, partner_id, code, name, visibility, status                                                               | active code unique per partner                         | Knowledge Space   |
| `knowledge.articles`            | Knowledge article identity             | id, partner_id, space_id, code, title, status, current_version_no, business_object_id                        | space/business object same partner; active code unique | Knowledge Article |
| `knowledge.article_versions`    | Immutable article content version      | id, partner_id, article_id, version_no, content_ref, content_hash, classification, authored_by, published_at | published version immutable                            | Knowledge Article |
| `knowledge.tags`                | Knowledge taxonomy                     | id, partner_id, code, label, status                                                                          | active code unique per partner                         | Knowledge Space   |
| `knowledge.article_tags`        | Article-tag link                       | id, partner_id, article_id, tag_id                                                                           | both same partner; unique pair                         | Knowledge Article |
| `knowledge.article_attachments` | Article-version evidence link          | id, partner_id, article_version_id, attachment_id, purpose_code                                              | both same partner; unique pair                         | Knowledge Article |

### AI additions — 9 tables

| Table                 | Purpose                          | Important logical fields                                                                                                                             | Relationship / invariant                                      | Aggregate  |
| --------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| `ai.models`           | Approved model identity          | id, provider_code, model_code, capability, risk_tier, status                                                                                         | global control-plane; code unique                             | AI Model   |
| `ai.model_versions`   | Model release/config             | id, model_id, version_label, release_ref, status, effective_from/to                                                                                  | version unique; deprecated versions retained                  | AI Model   |
| `ai.prompt_templates` | Partner prompt/use-case identity | id, partner_id, code, purpose_code, risk_tier, status, business_object_id                                                                            | active code unique per partner                                | AI Prompt  |
| `ai.prompt_versions`  | Prompt/config version            | id, partner_id, prompt_template_id, version_no, template_ref, template_hash, policy_json, published_at                                               | published immutable; sensitive content not logged             | AI Prompt  |
| `ai.requests`         | Governed AI invocation           | id, partner_id, model_version_id, prompt_version_id, business_object_id, requested_by, purpose_code, sensitivity, status, requested_at, completed_at | prompt/subject/requester same partner; idempotent request ref | AI Request |
| `ai.request_inputs`   | Typed AI input lineage           | id, partner_id, request_id, business_object_id, attachment_version_id, article_version_id, input_hash, classification                                | request same partner; at least one typed source               | AI Request |
| `ai.results`          | Immutable output/recommendation  | id, partner_id, request_id, result_type, output_ref, output_hash, confidence, status, generated_at, business_object_id                               | output protected by classification; no chain-of-thought       | AI Request |
| `ai.human_reviews`    | Human-in-the-loop decision       | id, partner_id, result_id, reviewer_membership_id, decision_code, reason_code, approval_request_id, reviewed_at                                      | same partner; append-only                                     | AI Request |
| `ai.feedback`         | Quality feedback                 | id, partner_id, result_id, membership_id, feedback_code, rating, notes_ref, recorded_at                                                              | same partner; append-only                                     | AI Request |

### Report additions — 7 tables

| Table                        | Purpose                           | Important logical fields                                                                                                           | Relationship / invariant                              | Aggregate         |
| ---------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| `report.definitions`         | Saved report identity             | id, partner_id, code, name, owner_membership_id, classification, status, business_object_id                                        | active code unique per partner                        | Report Definition |
| `report.definition_versions` | Report specification version      | id, partner_id, definition_id, version_no, source_contract_ref, parameter_schema_json, output_schema_json, published_at            | published immutable; no executable SQL stored         | Report Definition |
| `report.runs`                | Report execution record           | id, partner_id, definition_version_id, requested_by, business_object_id, status, requested_at, started_at, completed_at, row_count | inputs immutable after start                          | Report Run        |
| `report.run_sources`         | Data-lineage watermark            | id, partner_id, run_id, source_kind, source_version, watermark, snapshot_hash, business_object_id                                  | run same partner; append-only                         | Report Run        |
| `report.artifacts`           | Generated export metadata         | id, partner_id, run_id, attachment_id, format_code, classification, expires_at, checksum                                           | run/attachment same partner; sensitive export audited | Report Run        |
| `report.subscriptions`       | Scheduled report subscription     | id, partner_id, definition_version_id, membership_id, schedule_ref, delivery_channel, status, next_run_at                          | definition/member same partner; no credentials        | Report Definition |
| `report.snapshots`           | Frozen metric/read-model snapshot | id, partner_id, run_id, snapshot_type, period_start/end, storage_ref, row_count, checksum, created_at                              | immutable; not OLTP source of truth                   | Report Run        |

### Asset additions — 7 tables

| Table                           | Purpose                            | Important logical fields                                                                                                   | Relationship / invariant                | Aggregate    |
| ------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------ |
| `asset.asset_types`             | Asset/collateral classification    | id, partner_id, code, name, identifier_policy, status                                                                      | active code unique per partner          | Asset        |
| `asset.assets`                  | Recoverable physical asset         | id, partner_id, asset_type_id, business_object_id, display_ref, current_status_code, current_owner_customer_id, version_no | type/owner/business object same partner | Asset        |
| `asset.asset_identifiers`       | VIN/serial/external identifiers    | id, partner_id, asset_id, identifier_type, value_encrypted, value_hash, is_primary                                         | type+hash unique active within partner  | Asset        |
| `asset.asset_ownership_history` | Effective-dated ownership/interest | id, partner_id, asset_id, customer_id, owner_type, effective_from/to, source_ref                                           | same partner; non-overlap policy        | Asset        |
| `asset.case_assets`             | Case-to-asset link                 | id, partner_id, case_id, asset_id, relation_type, linked_at, unlinked_at                                                   | same partner; active relation unique    | Case / Asset |
| `asset.asset_inspections`       | Condition inspection               | id, partner_id, asset_id, visit_id, condition_code, inspected_at, inspected_by, summary_ref                                | finalized record immutable              | Asset        |
| `asset.asset_status_history`    | Asset lifecycle transitions        | id, partner_id, asset_id, from_status_code, to_status_code, changed_at, changed_by, reason_code                            | append-only                             | Asset        |

### Warehouse additions — 9 tables

| Table                          | Purpose                               | Important logical fields                                                                                                                     | Relationship / invariant                       | Aggregate          |
| ------------------------------ | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------ |
| `warehouse.facilities`         | Physical custody warehouse            | id, partner_id, branch_id, code, name, status, address_ref                                                                                   | branch same partner; active code unique        | Warehouse Facility |
| `warehouse.zones`              | Facility zone                         | id, partner_id, facility_id, code, name, status                                                                                              | code unique per facility                       | Warehouse Facility |
| `warehouse.bins`               | Physical storage position             | id, partner_id, zone_id, code, capacity_class, status                                                                                        | code unique per zone                           | Warehouse Facility |
| `warehouse.receipts`           | Asset intake receipt                  | id, partner_id, facility_id, case_id, business_object_id, receipt_ref, received_at, received_by, status                                      | same partner; receipt ref unique               | Warehouse Receipt  |
| `warehouse.receipt_items`      | Assets accepted on receipt            | id, partner_id, receipt_id, asset_id, condition_code, accepted_at                                                                            | one active receipt item per asset policy       | Warehouse Receipt  |
| `warehouse.stock_positions`    | Current asset position                | id, partner_id, asset_id, bin_id, placed_at, version_no                                                                                      | one current position per asset                 | Warehouse Position |
| `warehouse.movements`          | Immutable storage/custody movement    | id, partner_id, asset_id, from_bin_id, to_bin_id, movement_type, occurred_at, actor_membership_id, evidence_hash                             | same partner; append-only                      | Warehouse Position |
| `warehouse.handovers`          | Asset custody handover                | id, partner_id, asset_id, from_membership_id, to_membership_id, external_recipient_ref, handed_over_at, acknowledged_at, approval_request_id | exactly one destination type; same partner     | Asset Custody      |
| `warehouse.disposition_orders` | Approved release/return/sale/disposal | id, partner_id, asset_id, disposition_code, approval_request_id, status, authorized_at, completed_at, version_no                             | completion requires movement/handover evidence | Asset Disposition  |

### Enterprise Event Catalog additions — 6 tables

| Table                                 | Purpose                          | Important logical fields                                                                                    | Relationship / invariant                            | Aggregate        |
| ------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------- |
| `event_catalog.event_definitions`     | Stable enterprise event identity | id, code, owning_domain, aggregate_kind, classification, status                                             | global control-plane; code unique                   | Event Definition |
| `event_catalog.event_versions`        | Event contract version           | id, event_definition_id, version_no, payload_schema_id, compatibility_mode, effective_from/to, published_at | published immutable; definition+version unique      | Event Definition |
| `event_catalog.payload_schemas`       | Payload schema metadata          | id, schema_code, version_no, schema_ref, schema_hash, classification, status                                | schema code+version unique; immutable after publish | Payload Schema   |
| `event_catalog.publishers`            | Approved publisher registration  | id, partner_id, event_definition_id, publisher_code, integration_id, status                                 | partner optional; active tuple unique               | Event Definition |
| `event_catalog.subscriptions`         | Approved consumer contract       | id, partner_id, event_definition_id, consumer_code, min_version, delivery_policy_ref, status                | partner optional; no runtime secret                 | Event Definition |
| `event_catalog.compatibility_reviews` | Contract compatibility decision  | id, event_version_id, previous_version_id, decision_code, reviewed_by, approval_request_id, reviewed_at     | same definition; append-only                        | Event Definition |

---

# 6. Foreign Key Strategy

## Tenant-aware FK

ทุกความสัมพันธ์ระหว่างข้อมูล Partner ใช้คู่คีย์:

```text
child(partner_id, parent_id) → parent(partner_id, id)
```

ผลลัพธ์:

- Case ของ Partner A อ้าง Customer/Contract ของ Partner B ไม่ได้
- Assignment อ้าง Agent/Case ข้าม Partner ไม่ได้
- Payment Allocation, Attachment Link, KPI Event และ Commission Item ถูกแยก Tenant ในระดับฐานข้อมูล

## FK policy

1. Index ทุก FK ตามลำดับคอลัมน์ที่ Query ใช้
2. Default delete behavior เป็น `RESTRICT`; Soft Delete ไม่ทำ Cascade
3. `CASCADE` ใช้เฉพาะ Technical Child ที่ไม่มีความหมายเมื่อ Parent ถูกลบจริงใน Environment ทดสอบ และต้องอนุมัติเป็นรายกรณี
4. Actor/User reference อาจเป็น Nullable แต่ User record ไม่ถูก Hard Delete
5. Attachment ใช้ Explicit Link Table แทน Polymorphic FK
6. Audit/History generic entity reference ไม่ใช้ FK ตามเหตุผลด้าน Retention
7. Cycle ที่หลีกเลี่ยงไม่ได้ให้สร้าง FK ใน Migration phase หลัง Base Tables แต่ Design ปัจจุบันพยายามหลีกเลี่ยง Cycle
8. Cross-schema FK อนุญาตเมื่อ Aggregate Boundary ต้องรักษา Referential Integrity; ห้าม FK ไป Read Model/Materialized View

## Critical FK map

| Child                 | Parent                                                    |
| --------------------- | --------------------------------------------------------- |
| membership            | partner, user                                             |
| membership_role       | membership, role                                          |
| customer child tables | customer                                                  |
| contract              | partner, customer                                         |
| case                  | partner, branch, customer, optional contract, case status |
| assignment            | case, agent, optional team, assignment status             |
| visit                 | assignment                                                |
| payment               | customer, payment status                                  |
| payment allocation    | payment, contract, optional case                          |
| KPI event             | definition version, agent, optional case                  |
| commission item       | run, agent, optional case/payment                         |
| attachment link       | attachment + typed aggregate parent                       |
| notification delivery | notification + recipient                                  |

---

# 7. Index Strategy

## Mandatory index families

1. **Primary/tenant identity**
   - Unpartitioned: UUID PK
   - Tenant-partitioned: `(partner_id, id)` PK
2. **Foreign key indexes**
   - ทุก FK มี B-tree index โดยขึ้นต้น `partner_id` สำหรับ Tenant-owned tables
3. **Active-row uniqueness**
   - Partial Unique Index ที่ `deleted_at IS NULL` สำหรับ code/external_ref/contact ที่นำกลับมาใช้ซ้ำได้หลัง Soft Delete
4. **Case work queues**
   - `(partner_id, status_id, priority, next_action_at, id)` เฉพาะ Active Case
   - `(partner_id, branch_id, status_id, next_action_at, id)`
5. **Assignment queues**
   - `(partner_id, agent_id, status_id, due_at, id)` เฉพาะ Active Assignment
   - Partial Unique สำหรับ Active Assignment ตาม Business rule ที่จะยืนยัน
6. **History/timeline**
   - `(partner_id, case_id, occurred_at DESC, id)`
   - BRIN บน `occurred_at` สำหรับ Partition ขนาดใหญ่ที่ Insert ตามเวลา
7. **Payment**
   - `(partner_id, external_ref)` และ `(partner_id, idempotency_key)` แบบ Partial Unique
   - `(partner_id, customer_id, received_at DESC, id)`
8. **KPI/Commission**
   - `(partner_id, agent_id, occurred_at, definition_version_id)`
   - `(partner_id, period_start, period_end, status)`
9. **Notifications**
   - Partial queue index `(scheduled_at, priority, id)` สำหรับ Pending/Retry
   - Unique idempotency ต่อ Partner
10. **Audit**
    - `(partner_id, entity_type, entity_id, occurred_at DESC, id)`
    - `(partner_id, actor_user_id, occurred_at DESC, id)`

## Index governance

- ห้ามสร้าง GIN บน JSONB ทุกคอลัมน์โดยไม่มี Query Pattern
- PII Search ต้องผ่าน Security Design; ไม่สร้าง Fuzzy Index บน Plaintext Sensitive Data
- ใช้ `INCLUDE` เฉพาะ Query ที่พิสูจน์ด้วย Query Plan
- ใช้ Keyset/Cursor Pagination ไม่ใช้ Offset ขนาดใหญ่
- ตรวจ Duplicate/Unused Index จาก Production Statistics ก่อนเพิ่มหรือลบ
- ทุก Query สำคัญต้องมี `EXPLAIN (ANALYZE, BUFFERS)` บนข้อมูล representative ก่อน Production
- ชื่อ Index: `ix_<table>__<columns>`, Unique: `ux_<table>__<columns>`, Partial suffix `__active`

## Provisional query profiles and acceptance targets

ค่าด้านล่างเป็น Database Benchmark Target ไม่ใช่ API SLA และต้องวัดบนข้อมูลจำลอง 10M+ cases:

| Query profile                | Filter/order                                     | Cursor                           | Provisional DB p95 target |
| ---------------------------- | ------------------------------------------------ | -------------------------------- | ------------------------- |
| Case queue by partner/status | partner, active status, priority, next_action_at | `(priority, next_action_at, id)` | ≤ 250 ms                  |
| Agent assignment queue       | partner, agent, active status, due_at            | `(due_at, id)`                   | ≤ 250 ms                  |
| Case timeline first page     | partner, case, occurred_at desc                  | `(occurred_at, id)`              | ≤ 300 ms for 100 rows     |
| Customer payment history     | partner, customer, received_at desc              | `(received_at, id)`              | ≤ 300 ms for 100 rows     |
| Exact entity lookup          | partner + UUID                                   | none                             | ≤ 50 ms                   |

- BRIN เป็น Candidate เมื่อ table/partition มี time correlation สูง (เป้าหมาย correlation ≥ 0.90) และ B-tree cost/size สูง; Final choiceใช้ Benchmark เทียบ B-tree
- `INCLUDE` column และ covering index เพิ่มได้เมื่อ Query profile พิสูจน์ heap fetch bottleneck
- Partial index ต้องมี Query predicate ตรงกับ lifecycle catalog ที่อนุมัติ; ห้าม hardcode status ที่ยังไม่อนุมัติ

## FK-to-index minimum matrix

| FK class                              | Required child index prefix                                                 | Required parent key       |
| ------------------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| Tenant root child → partner           | `(partner_id)`                                                              | `partners(id)`            |
| Tenant child → tenant parent          | `(partner_id, parent_id)`                                                   | unique `(partner_id, id)` |
| Case history/timeline → case          | `(partner_id, case_id, <time_column> DESC, id)`                             | cases candidate key/PK    |
| Assignment → case/agent               | `(partner_id, case_id)` and `(partner_id, agent_id, status_id, due_at, id)` | tenant-aware parent keys  |
| Payment allocation → payment/contract | `(partner_id, payment_id)` and `(partner_id, contract_id)`                  | tenant-aware parent keys  |
| Explicit attachment link              | one index per `(partner_id, parent_id)` plus `(partner_id, attachment_id)`  | tenant-aware parent keys  |

`<time_column>` หมายถึงคอลัมน์เวลาจริงของแต่ละตาราง เช่น `changed_at`, `occurred_at` หรือ `attempted_at`; ไม่มีคอลัมน์ชื่อ `event_time` ใน Physical Design.

---

# 8. Partition Strategy

## Required time-series partitions

| Table                                   | Strategy              | Initial layout                             | Reason                                  |
| --------------------------------------- | --------------------- | ------------------------------------------ | --------------------------------------- |
| `recovery.case_status_history`          | Range by changed_at   | Monthly                                    | Append-only, retention/archive by month |
| `recovery.case_timeline_events`         | Range by occurred_at  | Monthly                                    | High-volume timeline                    |
| `workforce.assignment_status_history`   | Range by changed_at   | Monthly                                    | Append-only history                     |
| `workforce.field_location_events`       | Range by occurred_at  | Monthly; daily if measured volume requires | GPS volume/retention                    |
| `finance.payment_status_history`        | Range by changed_at   | Monthly                                    | Immutable payment history               |
| `performance.kpi_events`                | Range by occurred_at  | Monthly                                    | Event volume and period reporting       |
| `communication.notification_deliveries` | Range by attempted_at | Monthly                                    | Retry attempts/retention                |
| `audit.audit_events`                    | Range by occurred_at  | Monthly                                    | Audit retention and archive             |
| `audit.data_access_events`              | Range by occurred_at  | Monthly                                    | Sensitive-read audit volume             |

## Entity-history partition

| Table                  | Strategy                                       | Initial layout                                | Reason                                                                                                                               |
| ---------------------- | ---------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `audit.entity_history` | Hash by `(partner_id, entity_type, entity_id)` | 32 candidate partitions, benchmark before SQL | ทุก version ของ Entity เดียวอยู่ Partition เดียว จึงบังคับ Unique `(partner_id, entity_type, entity_id, entity_version)` ได้ข้ามเวลา |

## Core-table partition decision gate

`recovery.cases` และ `workforce.assignments` เริ่มเป็น **indexed non-partitioned logical design** จนกว่าจะมี representative dataset อย่างน้อย 10 ล้านเคส การตัดสินที่ M09 ต้องเปรียบเทียบอย่างน้อย:

1. Non-partitioned table + tenant/queue indexes
2. Hash 16/32 partitions ตาม `partner_id`
3. Range partition ตาม immutable business date
4. Multi-level strategy เฉพาะเมื่อ Partner skew และ time-retention พิสูจน์ว่าคุ้มกับ operational cost

ห้ามเลือก Hash by `partner_id` หาก Partner เดียวครองข้อมูลเกิน threshold ที่ Benchmark ยอมรับ

## Partition later when measured

- `finance.payments`
- `performance.commission_items`
- `document_store.attachment_versions`
- `platform.outbox_events`

เริ่ม Partition เมื่อ Row Count, Index size, Vacuum pressure, retention หรือ Query plan แสดงว่าจำเป็น—not just because table exists

## Operational rules

1. เตรียม Partition ล่วงหน้าอย่างน้อย 3 เดือน และมี Default Partition เป็น Safety Net
2. Monitoring ต้องแจ้งเตือนหาก Default Partition มีข้อมูล
3. Archive ด้วย Detach/Export/Verify ก่อน Drop ตาม Retention ที่อนุมัติ
4. Local Index ของทุก Partition ต้องมี Template/validation
5. ห้ามเปลี่ยน Partition Key ที่ Mutable
6. ไม่ Claim performance 10M+ จนผ่าน Load Test
7. Partition count ต้อง Review ทุกปี; ค่า 32 เป็น Candidate สำหรับ Benchmark ไม่ใช่ค่าที่อนุมัติล่วงหน้า
8. ก่อนสร้าง SQL ต้องวัด Partner skew: หาก Partner เดียวถือข้อมูลมากกว่าเกณฑ์ที่ Benchmark ยอมรับ ห้ามใช้ `HASH(partner_id)` โดยอัตโนมัติ ให้เปรียบเทียบ non-partitioned indexed table, time-based partition หรือ multi-level strategy ด้วยข้อมูลจำลอง
9. จำนวน 10 ล้านแถวเพียงอย่างเดียวไม่บังคับให้ Partition; Final choice ต้องผ่าน Benchmark Gate
10. FK/Unique Constraint บน Partitioned Parent ต้องรวม Partition Key

---

# 9. Naming Convention

## Database objects

- PostgreSQL schema/table/column/index/constraint: `snake_case`
- Table: plural noun เช่น `cases`, `payment_allocations`
- PK: `id`
- FK: `<entity>_id`; Tenant FK ต้องมี `partner_id` คู่กัน
- Timestamp: `<event>_at`; date range: `<name>_from`, `<name>_to`
- Boolean: `is_`, `has_`, `can_`
- Amount: `<name>_amount`; percentage/rate ระบุหน่วยชัด
- Status code: `status_id` เมื่อใช้ catalog; event snapshot อาจเก็บ `status_code` เพื่อ audit
- Encrypted: `<name>_encrypted`; hash: `<name>_hash`
- JSONB: `<name>_json` และต้องมี `schema_version`

## Constraints and indexes

- PK: `pk_<table>`
- FK: `fk_<child>__<parent>`
- Unique: `uq_<table>__<columns>`
- Check: `ck_<table>__<rule>`
- Exclusion: `ex_<table>__<rule>`
- Index: `ix_<table>__<columns>`
- Unique index: `ux_<table>__<columns>`

## Controlled vocabulary

- Code values ใช้ lowercase `snake_case`
- ห้ามใช้ชื่อกำกวม เช่น `data`, `value`, `type` โดยไม่มี Domain prefix
- ห้ามตั้งชื่อ Reserved Word เช่น `user`, `order`, `group`
- ชื่อ Partner-specific external IDs ต้องระบุ source เช่น `external_ref`, `provider_ref`, `source_ref`

---

---

# 10. Modified Baseline Entity Contracts

No baseline table is removed.

| Existing table                     | Added logical relationship                                                    | Reason                                          |
| ---------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------- |
| recovery.cases                     | business_object_id                                                            | Workflow/Approval/SLA subject                   |
| workforce.assignments              | business_object_id                                                            | Workflow/SLA subject                            |
| workforce.field_visits             | business_object_id                                                            | Workflow/SLA/AI subject                         |
| workforce.field_location_events    | tracking_session_id                                                           | GPS governance boundary                         |
| finance.payments                   | business_object_id, payment_method_item_id, channel_item_id                   | Approval/Workflow + Master Data                 |
| finance.payment_reversals          | business_object_id, approval_request_id                                       | approval evidence                               |
| finance.reconciliation_batches     | business_object_id, approval_request_id                                       | finalization approval                           |
| performance.kpi_period_results     | business_object_id, approval_request_id                                       | finalize/reopen approval                        |
| performance.commission_runs        | business_object_id, approval_request_id                                       | run finalization approval                       |
| performance.commission_adjustments | business_object_id, approval_request_id                                       | governed approval replaces lone field semantics |
| document_store.attachments         | business_object_id                                                            | Workflow/Approval/AI/Report subject             |
| communication.notifications        | event_version_id, correlation_id, causation_id                                | contracted trigger                              |
| recovery.case_timeline_events      | event_version_id, correlation_id, causation_id, visibility_code               | contracted projection                           |
| platform.outbox_events             | event_version_id, correlation_id, causation_id, idempotency_key, payload_hash | versioned event publication                     |

---

# 11. Relationship Matrix v2.1

All tenant-owned edges carry partner scope; default lifecycle behavior is restrict/soft retirement.

| Parent/source               | Child/target                                               | Cardinality | Integrity rule                               |
| --------------------------- | ---------------------------------------------------------- | ----------- | -------------------------------------------- |
| Role Permission             | Permission Scope                                           | 1:N         | same partner; scope type/resource normalized |
| SoD Rule                    | Maker + Checker Permission                                 | N:1         | effective-dated incompatibility              |
| Case                        | Assignment / Asset / Workflow / SLA                        | 1:N         | tenant-aware subject boundary                |
| Assignment                  | Handoff / Visit                                            | 1:N         | handoff append-only                          |
| Visit                       | Tracking Session / Participant / Checklist / Contact / PTP | 1:N         | field evidence same partner                  |
| Tracking Session            | Location Event / Anomaly                                   | 1:N         | device/legal basis bounded                   |
| PTP                         | PTP Status History                                         | 1:N         | append-only                                  |
| Payment                     | Provider Transaction / Dispute / Allocation / Reversal     | 1:N         | facts and corrections retained               |
| Reconciliation Batch        | Reconciliation Item                                        | 1:N         | item links payment/provider fact             |
| Commission Run              | Commission Payout                                          | 1:N         | payout version per run/currency              |
| Commission Payout           | Payout Item / Status History                               | 1:N         | no duplicate active item                     |
| Attachment Version          | Scan Result                                                | 1:N         | scan evidence immutable                      |
| Legal Hold                  | Attachment                                                 | M:N         | explicit link                                |
| Asset                       | Attachment                                                 | M:N         | explicit link                                |
| Catalog                     | Version → Item → Localization                              | 1:N         | published boundary                           |
| Workflow Definition Version | State / Transition / Instance                              | 1:N         | instance pins exact graph                    |
| Business Object             | Typed Domain Root                                          | 1:1         | root owns unique business_object_id          |
| Business Object             | Workflow / Approval / SLA / AI / Report                    | 1:N         | strong FK to supertype identity              |
| Workflow Instance           | Work Item / Assignment / History                           | 1:N         | history append-only                          |
| Approval Policy Version     | Policy Step / Request                                      | 1:N         | request pins policy version                  |
| Approval Request            | Request Step / Decision                                    | 1:N         | decision actor same partner                  |
| SLA Policy Version          | Target / Instance                                          | 1:N         | instance pins timer definition               |
| SLA Instance                | Pause / Breach / Escalation                                | 1:N         | append-only evidence                         |
| Knowledge Space             | Article → Version                                          | 1:N         | publication boundary                         |
| Knowledge Version           | Attachment / AI Input                                      | 1:N         | immutable citation                           |
| AI Model + Prompt Version   | AI Request                                                 | 1:N         | request pins exact versions                  |
| AI Request                  | Input / Result / Review / Feedback                         | 1:N         | lineage and HITL                             |
| Report Definition Version   | Run / Subscription                                         | 1:N         | run pins exact spec                          |
| Report Run                  | Source / Artifact / Snapshot                               | 1:N         | lineage and export evidence                  |
| Asset Type                  | Asset                                                      | 1:N         | partner classification                       |
| Case                        | Asset                                                      | M:N         | explicit case_assets                         |
| Asset                       | Ownership / Inspection / Status / Custody                  | 1:N         | reconstructable lifecycle                    |
| Facility                    | Zone → Bin; Receipt                                        | 1:N         | physical hierarchy                           |
| Receipt                     | Receipt Item → Asset                                       | 1:N         | custody intake                               |
| Asset                       | Position / Movement / Handover / Disposition               | 1:N         | movement source of truth                     |
| Event Definition            | Version / Publisher / Subscription                         | 1:N         | contract governance                          |
| Payload Schema              | Event Version                                              | 1:N         | immutable schema binding                     |
| Event Version               | Compatibility Review / Outbox Event                        | 1:N         | catalog contract vs runtime record           |

---

# 12. Enterprise Event Catalog v2.1

`event_catalog.*` is the contract source, `platform.outbox_events` is the runtime publication record, and Case Timeline is a projection. Published contracts are immutable and compatibility-reviewed.

| Owning domain  | Event code                            | Initial version | Catalog state                 | Required envelope                                                                                                           |
| -------------- | ------------------------------------- | --------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Tenant         | partner.onboarded                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Tenant         | partner.activated                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Tenant         | partner.suspended                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Tenant         | partner.setting.changed               | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| IAM            | membership.created                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| IAM            | role.assigned                         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| IAM            | permission.scope.changed              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| IAM            | sod.violation.detected                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Customer       | customer.created                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Customer       | customer.updated                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Customer       | customer.merged                       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Customer       | customer.consent.changed              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.opened                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.triaged                          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.status.changed                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.escalated                        | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.closed                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Recovery       | case.reopened                         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | agent.device.bound                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | assignment.created                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | assignment.accepted                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | assignment.rejected                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | assignment.reassigned                 | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | visit.started                         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | visit.contact.recorded                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | visit.completed                       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | tracking.started                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | location.recorded                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | tracking.anomaly.detected             | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | tracking.stopped                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | ptp.created                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workforce      | ptp.status.changed                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | payment.received                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | payment.verified                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | payment.allocated                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | provider.transaction.received         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | reconciliation.item.matched           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | reconciliation.exception.raised       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | payment.disputed                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Finance        | payment.reversed                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Performance    | kpi.result.finalized                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Performance    | commission.run.finalized              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Performance    | commission.payout.approved            | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Performance    | commission.payout.paid                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Document       | document.uploaded                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Document       | document.scan.passed                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Document       | document.scan.failed                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Document       | legal_hold.applied                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Document       | legal_hold.released                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Communication  | notification.requested                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Communication  | notification.delivered                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Communication  | notification.failed                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Communication  | notification.dead_lettered            | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Master Data    | master_data.catalog.version.published | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Master Data    | master_data.item.retired              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Master Data    | master_data.external_mapping.changed  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | workflow.definition.published         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | workflow.instance.started             | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | workflow.state.changed                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | work_item.assigned                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | work_item.completed                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | workflow.instance.completed           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Workflow       | workflow.instance.cancelled           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.requested                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.step.assigned                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.approved                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.rejected                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.returned                     | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.delegated                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.expired                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Approval       | approval.escalated                    | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.started                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.paused                            | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.resumed                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.breached                          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.escalated                         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| SLA            | sla.met                               | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Knowledge      | knowledge.article.drafted             | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Knowledge      | knowledge.article.published           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Knowledge      | knowledge.article.retired             | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.requested                          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.completed                          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.failed                             | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.reviewed                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.accepted                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.rejected                           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| AI             | ai.feedback.recorded                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.requested                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.started                        | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.generated                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.failed                         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.exported                       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.subscription.triggered         | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Report         | report.artifact.expired               | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Asset          | asset.registered                      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Asset          | asset.linked.to_case                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Asset          | asset.inspected                       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Asset          | asset.status.changed                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Asset          | asset.recovered                       | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.asset.received              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.asset.placed                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.asset.moved                 | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.asset.handed_over           | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.disposition.authorized      | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Warehouse      | warehouse.asset.released              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Event Catalog  | event.definition.created              | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Event Catalog  | event.version.published               | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Event Catalog  | event.compatibility.approved          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Event Catalog  | event.publisher.registered            | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Event Catalog  | event.subscription.activated          | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Audit/Platform | audit.event.recorded                  | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Audit/Platform | sensitive_data.accessed               | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Audit/Platform | outbox.event.published                | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |
| Audit/Platform | outbox.event.failed                   | v1              | definition + version required | partner_id, aggregate/business_object id, occurred_at, actor, correlation_id, causation_id, idempotency_key, classification |

---

# 13. Permission Boundary v2.1

| Boundary      | Permission family                                                          | Resource scope                    | SoD / audit rule                              |
| ------------- | -------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------- |
| Approval      | approval.request/approve/reject/return/delegate/admin/view                 | subject + partner                 | maker-checker/quorum                          |
| AI            | ai.invoke/review/accept/reject/admin/view_sensitive/use_customer_data      | subject + classification          | AI cannot approve itself                      |
| Report        | report.view/create/publish/run/export_sensitive/schedule/admin             | owner/team/branch/partner + class | PII/GPS export separate                       |
| Workflow      | workflow.define/publish/start/assign/complete/cancel/admin                 | partner + subject                 | publish/override audited                      |
| Knowledge     | knowledge.read/draft/review/publish/retire/manage_sensitive                | space + class                     | reviewer/publisher separation                 |
| Asset         | asset.read/register/update/link/inspect/change_status/view_sensitive       | branch/partner                    | custody status approval                       |
| Warehouse     | warehouse.receive/place/move/handover/dispose/view                         | facility/branch/partner           | handover/disposition maker-checker            |
| SLA           | sla.define/publish/view/pause/resume/acknowledge/escalate                  | team/branch/partner               | manual pause/override audited                 |
| Master Data   | master_data.read/draft/publish/retire/map_external                         | global or partner owner           | publisher separate from drafter               |
| Event Catalog | event.read/draft/publish/register_publisher/subscribe/compatibility_review | global/partner binding            | publisher cannot self-approve incompatibility |
| GPS/Visit/PTP | gps.record/view_live/view_history/export; visit.complete; ptp.manage       | own/team/branch/partner           | GPS export separate                           |
| Finance       | payment.record/verify/allocate/reconcile/reverse/dispute.manage            | branch/partner                    | maker-checker                                 |
| Performance   | kpi.finalize; commission.run/approve/payout                                | own/team/partner                  | cannot finalize own result                    |
| Document      | document.upload/view/download/view_sensitive/legal_hold/manage_scan        | class + partner                   | uploader cannot override scan/hold            |

Permissions remain in `iam.permissions`; grants in `iam.role_permissions`; normalized scope in `iam.permission_scopes`; maker-checker rules in `iam.separation_of_duty_rules`.

Partner-owned publishable roots (`master_data.catalogs`, `workflow.definitions`, `approval.policies`, `sla.policies`, `ai.prompt_templates`, `report.definitions`, `knowledge.articles`) own a `business_object_id`; approval requests pin `subject_version_ref` and `subject_version_hash`. Global AI model and Enterprise Event contract publication uses global IAM plus immutable compatibility/review and audit records; it does not fabricate a tenant approval request.

---

# 14. Mandated Domain Coverage — Eight Dimensions

This matrix is the acceptance trace for the ten domains explicitly required by Stage 2.6. The detailed table names and invariants remain in Sections 5B, 10–13 and 15.

| Domain                   | Aggregate                           | Entity                             | Relationship                                                                 | Event                                                                                                         | Permission Boundary                                   | History                                                          | Audit                                                  | Scalability                                                |
| ------------------------ | ----------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| Approval                 | Policy; Request                     | 7 tables                           | Business Object, Workflow, Membership                                        | requested/approved/rejected/returned/delegated/expired/escalated                                              | approval.* + subject scope + SoD                      | Policy versions; request steps; immutable decisions              | decision/evidence hash + actor + generic audit         | active queue; monthly decisions candidate                  |
| AI                       | Model/Prompt; Request               | 9 tables                           | Business Object, Attachment Version, Knowledge Version, Membership, Approval | requested/completed/failed/reviewed/accepted/rejected/feedback                                                | ai.* + classification; cannot self-approve            | model/prompt versions; immutable inputs/results/reviews/feedback | lineage hashes + sensitive access; no chain-of-thought | monthly workload; quota; retention by sensitivity          |
| Report                   | Definition; Run                     | 7 tables                           | Membership, Business Object, Attachment, Event source                        | requested/started/generated/failed/exported/subscription triggered/artifact expired                           | report.* + owner/team/branch/partner + classification | definition versions; immutable runs/sources/artifacts/snapshots  | request/export/download/schedule audit                 | async queue; snapshots/object storage; no OLTP full scan   |
| Workflow                 | Definition; Instance                | 9 tables                           | Business Object, Membership/Role, Approval/SLA consumers                     | definition published/instance started/state changed/work item assigned/completed/instance completed/cancelled | workflow.* + subject scope                            | definition versions; append-only instance/task transitions       | publish/override/assignment/cancel audit               | state/due queue; monthly history candidate                 |
| Knowledge                | Space; Article                      | 6 tables                           | Attachment, AI Input, Business Object                                        | article drafted/published/retired                                                                             | knowledge.* + space/classification                    | immutable article versions; tag/link history                     | publish/retire/sensitive-read audit                    | content outside rows; classification-aware search later    |
| Asset                    | Asset                               | 7 tables + evidence/custody tables | Case, Customer ownership, Visit inspection, Attachment, Warehouse            | registered/linked/inspected/status changed/recovered                                                          | asset.* + branch/partner; custody status approval     | ownership/status/inspection histories                            | identifier/condition/status/custody audit              | hash identifier lookup; monthly status candidate           |
| Warehouse                | Facility; Receipt; Position/Custody | 9 tables                           | Branch, Case, Asset, Membership, Approval                                    | received/placed/moved/handed over/disposition authorized/released                                             | warehouse.* + facility/branch/partner + maker-checker | movement/handover append-only; current position separate         | receive/move/handover/disposition evidence             | monthly movement candidate; direct current-position lookup |
| SLA                      | Policy; Instance                    | 7 tables                           | Business Object, Workflow, Notification                                      | started/paused/resumed/breached/escalated/met                                                                 | sla.* + team/branch/partner                           | policy versions; pauses/breaches/escalations append-only         | manual pause/override/acknowledge audit                | due queue; monthly breach candidate                        |
| Master Data              | Catalog                             | 5 tables                           | Global/Partner owner, Integration mapping                                    | catalog version published/item retired/mapping changed via cataloged control events                           | master_data.* + owner scope + maker-checker           | immutable published catalog versions                             | draft/publish/retire/map audit                         | small cacheable control plane                              |
| Enterprise Event Catalog | Event Definition                    | 6 tables                           | Payload Schema, Publisher, Subscriber, Approval, Outbox                      | definition created/version published/compatibility approved/publisher registered/subscription activated       | event.* + global/partner binding                      | immutable event/schema versions and compatibility decisions      | publish/compatibility/registration audit               | small cached control plane; runtime volume remains Outbox  |

---

# 15. History, Audit and Scalability

| Domain        | History / audit                                               | Scalability                                              |
| ------------- | ------------------------------------------------------------- | -------------------------------------------------------- |
| Approval      | decision append-only; audit + entity history                  | active queue; monthly decisions candidate                |
| AI            | model/prompt/input/result/review lineage; no chain-of-thought | monthly requests/results; quotas; sensitivity retention  |
| Report        | run sources/artifacts/snapshots immutable; export audit       | async queue; snapshots/object storage; no OLTP full scan |
| Workflow      | versioned definitions; instance history append-only           | state/due queue; monthly history candidate               |
| Knowledge     | published versions immutable; access/publish audit            | content outside rows; classification-aware search later  |
| Asset         | ownership/status/inspection history                           | identifier hash lookup; monthly status candidate         |
| Warehouse     | movement/handover custody history                             | current position separate; monthly movement candidate    |
| SLA           | pauses/breaches/escalations append-only                       | due queue; monthly breach candidate                      |
| Master Data   | published catalog immutable                                   | small cacheable control plane                            |
| Event Catalog | event/schema versions and reviews immutable                   | small cached control plane                               |

Cross-cutting rules:

- Time-series/history partitioning remains benchmark-gated; do not partition all 161 tables.
- Monthly candidates include GPS/anomaly, workflow history, approval decisions, SLA breaches, PTP history, provider/reconciliation facts, payout history, AI requests/results, report runs/snapshots, asset status and warehouse movements.
- Small versioned control planes remain non-partitioned and cacheable.
- Large content/export artifacts remain in private object storage with checksum/classification/expiry metadata.

---

# 16. Security, Privacy and Retention Gates

- Tenant-aware relationship + future fail-closed RLS implementation.
- PII/identifier encryption + deterministic hash lookup + sensitive-access audit.
- GPS collection requires session, device and legal basis/consent reference; view/export are separately authorized.
- AI stores lineage/hashes/references and human decisions, never hidden chain-of-thought.
- Legal Hold suspends document/asset evidence disposition.
- Retention periods require Business/Legal/Security approval; this revision defines record classes only, not deletion jobs.

---

# 17. Database Gate Review Checklist

- [x] Confirm Warehouse means physical recovered-asset custody; analytical storage remains future Report boundary.
- [x] Approve 21 domains and 161-table catalog.
- [x] Approve `workflow.business_objects` supertype identity.
- [x] Approve Approval maker-checker/quorum/delegation model.
- [x] Approve AI human-in-the-loop and prohibited autonomous action boundary.
- [x] Approve PTP, GPS legal basis/session, reconciliation, payout and asset custody lifecycles.
- [x] Approve Permission/SoD and Enterprise Event Catalog.
- [x] Approve provisional benchmark-gated scale strategy.
- [x] Approve ADR-0002 alignment with v2.1.

```text
Logical Database Design v2.1: ACCEPTED AND FROZEN 2026-07-21
ADR-0002: ACCEPTED
Stage 3 Physical Schema Design: AUTHORIZED BY ARCHITECTURE FREEZE v1.0
Executable Migration/Deployment: BLOCKED until Stage 3 design and verification gates pass
API / Frontend / Business Logic: OUT OF SCOPE
```

This artifact contains no executable SQL, DDL, migration, API, frontend specification or business-logic algorithm. Legacy v1.1 migrations remain superseded/frozen.
