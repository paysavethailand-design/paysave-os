# PAYSAVE OS — Stage 2 Database Design v2.0

> **Status:** Superseded by v2.1 after Stage 2.5 Business Validation  
> **Role:** Principal Database Architect  
> **Scope:** PostgreSQL database design only  
> **Out of scope:** SQL/DDL, Frontend, API, Business Logic, RLS policy implementation, KPI/Commission formula implementation

## Executive decision

PAYSAVE OS ใช้ PostgreSQL แบบ **shared database, shared schemas, tenant-isolated rows** โดย `partner_id` เป็น Tenant Boundary ของข้อมูลธุรกิจทุกตาราง ใช้ UUID เป็น Entity Key, ใช้ Tenant-aware FK, แยก Current State ออกจาก Append-only History/Timeline/Audit และ Partition เฉพาะตารางปริมาณสูง

Design target คือรองรับผู้ใช้มากกว่า 10,000 คนและเคสมากกว่า 10 ล้านเคส แต่การกล่าวว่า “รองรับใน Production แล้ว” ต้องผ่าน Load Test, Query-plan validation และ Capacity Test หลังมี SQL/Staging ใน Stage ถัดไป

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

# 1. Domain Model

| Domain            | ความรับผิดชอบ                                    | ข้อมูลหลัก                             | Tenant scope                     |
| ----------------- | ------------------------------------------------ | -------------------------------------- | -------------------------------- |
| Tenant            | Partner, Setting, Branch                         | Partner configuration และขอบเขตองค์กร  | Partner root                     |
| Identity & Access | User, Membership, Role, Permission, Branch Scope | Multi-partner และ Multi-role           | Global user + Partner membership |
| Customer          | Customer, Identifier, Contact, Address           | บุคคล/องค์กรที่เกี่ยวกับการติดตาม      | Partner                          |
| Recovery          | Contract, Case, Status, Timeline, Note, Tag      | Lifecycle ของงาน Field Recovery        | Partner                          |
| Workforce         | Agent, Team, Assignment, Visit, Location         | การมอบหมายและปฏิบัติงานภาคสนาม         | Partner                          |
| Finance           | Payment, Allocation, Reversal, Reconciliation    | เงินรับและการเชื่อมกับเคส/สัญญา        | Partner                          |
| Performance       | KPI, Target, Result, Commission                  | ผลงานแบบ Versioned และตรวจย้อนหลังได้  | Partner                          |
| Document          | Attachment, Version, Explicit Link               | Metadata ไฟล์และหลักฐาน                | Partner                          |
| Communication     | Notification, Recipient, Delivery                | Queue และผลส่งหลาย Channel             | Partner                          |
| Audit             | Audit Event, Entity History, Data Access         | ตรวจว่าใครทำอะไร เมื่อใด               | Partner/global control plane     |
| Platform          | Outbox, Idempotency, Integration                 | ความน่าเชื่อถือและการเชื่อมระบบในอนาคต | Partner                          |

### Global vs tenant-owned entities

- Global control-plane entities มีเพียง `iam.users`, `iam.role_templates` และ `iam.permissions`; ไม่มี `partner_id` และห้ามเก็บ Business Record ของ Partner
- `tenant.partners` เป็น Tenant root; Child อ้างด้วย `partner_id`
- ตารางธุรกิจอื่นทั้งหมดเป็น Tenant-owned และต้องมี `partner_id`, Tenant-aware FK และ RLS ใน Stage Implementation

## ความสัมพันธ์ธุรกิจหลัก

```text
Partner
 ├─ Branch
 ├─ Membership ─ Role ─ Permission
 ├─ Customer ─ Contract ─ Case
 │                         ├─ Assignment ─ Field Visit
 │                         ├─ Timeline / Status History / Note
 │                         ├─ Payment Allocation
 │                         └─ Attachment
 ├─ KPI Definition/Target/Event/Result
 ├─ Commission Plan/Run/Item
 └─ Notification/Delivery

ทุกการเปลี่ยนสำคัญ ─→ Audit Event + Entity History
```

---

# 2. ER Diagram

ERD แยกเป็นไฟล์ Mermaid เพื่อ Review ได้ง่าย:

- `docs/database/PAYSAVE_Recovery_ERD_v2.0.mmd`
- Rendered review artifact: `docs/database/PAYSAVE_Recovery_ERD_v2.0.svg`

ERD แสดง PK/FK และความสัมพันธ์ของ Aggregate หลัก โดย Table Catalog ในเอกสารนี้เป็น Source of Truth สำหรับรายการตารางทั้งหมด

---

# 3. Aggregate Design

| Aggregate Root  | Child Entities                                               | Invariant ระดับฐานข้อมูล                                                                            |
| --------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Partner         | Partner Setting, Branch                                      | Key/slug ไม่ซ้ำ; ทุก Child อยู่ Partner เดียวกัน                                                    |
| Membership      | Membership Role, Branch Scope                                | User ซ้ำใน Partner ไม่ได้; Role/Branch ต้องเป็น Partner เดียวกัน                                    |
| Customer        | Identifier, Contact, Address                                 | External reference/identifier ไม่ซ้ำภายใน Partner ตามชนิด                                           |
| Contract        | Balance History                                              | Customer และ Contract ต้องเป็น Partner เดียวกัน                                                     |
| Case            | External Reference, Status History, Timeline, Note, Case Tag | Customer/Contract/Status ต้องเป็น Partner เดียวกัน; Current Status แยกจาก History                   |
| Team            | Team Member                                                  | Agent และ Team ต้องเป็น Partner เดียวกัน                                                            |
| Assignment      | Status History                                               | Case/Agent/Team ต้องอยู่ Partner เดียวกัน; Active uniqueness ใช้ Partial Unique Index               |
| Field Visit     | Outcome, Location Event                                      | Visit ต้องผูก Assignment เดียวและอยู่ Partner เดียวกัน                                              |
| Payment         | Allocation, Status History, Reversal                         | จำนวน Allocation สุทธิห้ามเกินยอดที่ยืนยัน—กฎคำนวณรอ Business Logic; FK tenant-aware บังคับได้ทันที |
| KPI Definition  | Definition Version, Target, Event, Period Result             | Version ที่ Published แล้วห้ามแก้ย้อนหลัง                                                           |
| Commission Plan | Plan Version, Run, Item, Adjustment                          | Run/Item ที่ Finalized เป็น Immutable                                                               |
| Attachment      | Attachment Version และ Explicit Link                         | Object key/version ไม่ซ้ำ; Link ต้องอยู่ Partner เดียวกัน                                           |
| Notification    | Recipient, Delivery                                          | Idempotency ต่อ Partner/Channel; Delivery เป็น Append-only attempt                                  |

`Audit Event`, `Entity History`, `Data Access Event` และ `Outbox Event` เป็น Cross-cutting append-only records ไม่เป็น Child ที่ถูกลบตาม Aggregate

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

# 5. Table List — 67 Tables

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

# 10. Migration Strategy — Design Only, No SQL

## Current safety state

- Stage 2 v2.0 เป็น Conceptual/Logical Design เท่านั้น
- ห้ามสร้างหรือแก้ DDL จากเอกสารนี้จน Database Gate Approved
- Migration `0001/0002` ที่มีอยู่เป็น Legacy Technical Draft จาก Blueprint v1.1 และ **ไม่ใช่ Implementation ของ v2.0** เพราะใช้ bigint physical PK ซึ่งไม่ตรง UUID PK requirement ใหม่
- ห้ามรัน Legacy Migration บน Production และห้ามแก้ให้ดูเหมือน v2.0 โดยไม่มี Migration Review แยก

## Planned migration sequence after approval

| Phase | Scope                                                           | Dependency              |
| ----- | --------------------------------------------------------------- | ----------------------- |
| M00   | Extension capability, schemas, ownership, environment preflight | Infrastructure approval |
| M01   | Tenant + IAM base tables                                        | M00                     |
| M02   | Customer domain                                                 | M01                     |
| M03   | Recovery contract/case/status                                   | M01–M02                 |
| M04   | Workforce/assignment/visit                                      | M03                     |
| M05   | Finance/payment/allocation                                      | M02–M03                 |
| M06   | Document + Communication                                        | M01, target aggregates  |
| M07   | KPI + Commission                                                | M03–M05                 |
| M08   | Audit + Platform reliability tables                             | M01                     |
| M09   | Partitions, indexes, constraints, FK validation                 | M01–M08                 |
| M10   | RLS policies and least-privilege grants                         | Approved Role Matrix    |
| M11   | Seed catalogs/statuses/templates                                | Business approval       |
| M12   | Load test, query-plan acceptance, backup/restore rehearsal      | Staging complete        |

## Migration rules

1. Forward-only versioned migration; checksum/immutable after apply
2. Additive `Expand → Backfill → Validate → Switch → Contract`
3. Destructive change แยก Release และต้องมี Backup/PITR + Restore rehearsal
4. Large index ใช้ Online/Concurrent strategy ใน Migration แยกที่รองรับ non-transactional operation
5. FK ขนาดใหญ่สร้างแบบลด lock แล้ว Validate ภายหลังเมื่อ SQL Stage ได้รับอนุมัติ
6. Backfill เป็น batch แบบ keyset, resumable และมี progress watermark
7. Partition creation/retention มี Runbook และ alert
8. Migration ต้องทดสอบบน Empty DB และ Production-like snapshot ที่ทำ Masking แล้ว
9. Rollback เน้น Forward fix; rollback schema destructive ใช้ snapshot/PITR ไม่ใช้ blind down migration และต้องทำตาม State Matrix ด้านล่าง
10. ทุก Migration ต้องผ่าน parser, disposable PostgreSQL runtime, catalog verification, integrity smoke test และ migration-time measurement
11. RLS เปิดแบบ fail-closed ก่อน App access; policy จริงรอ Role Matrix
12. Production deploy ต้องมี Change Window, owner, rollback trigger, monitoring และ approval record

## Migration state and rollback matrix

| State                   | Before switch                               | Rollback/stop action                                                                   | Contract allowed when                                       |
| ----------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Expand                  | New nullable object exists, old path active | Stop migration; remove new object only if unused and verified                          | Never in same release                                       |
| Backfill                | Batch watermark in progress                 | Pause/resume from watermark; old path remains source of truth                          | Validation complete                                         |
| Validate                | Constraint/index being checked              | Cancel/retry operation; keep old path                                                  | Zero invalid rows and query plan accepted                   |
| Switch                  | New path becomes authoritative              | Feature/config switch back to old compatible path; preserve dual-compatible schema     | Stable for agreed observation window                        |
| Contract                | Old object scheduled for removal            | Restore from snapshot/PITR or forward-recreate; requires explicit destructive approval | No old readers/writers, backup and restore rehearsal passed |
| Concurrent index        | Index build running/invalid                 | Cancel and drop invalid artifact in reviewed follow-up migration                       | Index valid and observed                                    |
| Partition attach/detach | Boundary validation in progress             | Keep/reattach source partition; block retention deletion                               | Row-count/checksum and backup verification passed           |

---

# Security, Privacy and Retention Gates

- Partner isolation: tenant-aware FK + RLS ใน Stage implementation
- Sensitive PII: encryption at rest field strategy + hash lookup + access audit
- Attachments: private bucket, checksum, malware scan status, signed access
- Audit immutability: append-only permission/trigger designใน SQL Stage
- User deletion: deactivate/anonymizeตาม Legal Policy; ไม่ทำลาย audit reference
- Retention ต้องอนุมัติแยกสำหรับ GPS, PII, payment, attachment, notification, operational log และ audit
- Backup: PITR, encrypted backup, restore test และ tenant export policy

## Provisional retention and storage baseline

ตารางนี้ใช้สำหรับ Capacity Planning เท่านั้น ไม่ใช่คำวินิจฉัยกฎหมาย และ **ห้ามลบอัตโนมัติ** จน Business/Legal/Security อนุมัติ Final Policy; Legal Hold ระงับการลบเสมอ

| Data class                          |          Hot online |  Warm/archive target | Proposed disposal gate                              |
| ----------------------------------- | ------------------: | -------------------: | --------------------------------------------------- |
| Active case/contract/current state  |         ตลอดอายุเคส |          7 ปีหลังปิด | Legal + Partner contract approval                   |
| Case status/timeline/entity history |            24 เดือน |   ถึง 7 ปีหลังปิดเคส | Reconstruction test + legal approval                |
| Payment/commission/reversal         |            24 เดือน |             ถึง 7 ปี | Finance/legal approval; no deletion during dispute  |
| Audit/data-access events            |            24 เดือน |             ถึง 7 ปี | Security/legal approval + immutable export checksum |
| Field GPS/location events           |              90 วัน |          ถึง 365 วัน | Privacy approval; delete unless legal hold          |
| Notification deliveries             |             180 วัน |             ถึง 1 ปี | Security/operations approval                        |
| Published outbox events             |              90 วัน |             ถึง 1 ปี | Consumer watermark and replay window verified       |
| Idempotency records                 | ถึง expiry + 30 วัน | ไม่จำเป็นโดย default | Duplicate-risk window verified                      |
| Attachment metadata/object          |   ตาม Parent record | ตาม Parent retention | Legal hold, checksum and archive verification       |

Capacity model ใน SQL Stage ต้องคำนวณ row/day, average row size, index multiplier, archive growth และ restore time แยกตาม Data class ก่อน Production approval

---

# Approval checklist

- [ ] ยืนยัน Partner เป็น Tenant Boundary
- [ ] ยืนยัน UUIDv7 preference และ Composite PK exception สำหรับ Partitioned Tables
- [ ] ยืนยัน Customer/Contract/Case ไม่แชร์ข้าม Partner
- [ ] ยืนยัน Case สามารถ Intake โดย `contract_id` ว่างได้หรือไม่
- [ ] ยืนยัน Multi-role และ Branch scope model
- [ ] ยืนยัน Case/Assignment/Payment status catalogs
- [ ] ยืนยัน Active Assignment uniqueness rule
- [ ] ยืนยัน Payment allocation/reversal semantics
- [ ] ยืนยัน KPI/Commission versioning และ finalization policy
- [ ] ยืนยัน Retention ของ GPS/History/Audit/Attachment/Notification
- [ ] อนุมัติ Benchmark Gate สำหรับเลือก non-partitioned vs Hash/Range/Multi-level โดยไม่ล็อก 32 partitions ล่วงหน้า
- [ ] ยืนยัน Migration v1.1 เดิมถูก Freeze และไม่ใช้เป็น v2.0
- [ ] อนุมัติ ADR-0002

หลังอนุมัติจึงเข้าสู่ Technical Schema/DDL Design แยก Stage; รอบนี้ไม่มี SQL ถูกสร้างหรือแก้ไข
