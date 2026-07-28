# PAYSAVE Recovery Database Blueprint v1.1

> **สถานะ: Superseded / Frozen** — เก็บไว้เป็น Historical Technical Draft เท่านั้น ห้ามใช้เป็น Stage 2 v2.0 หรือรัน Production เพราะใช้ bigint physical PK ซึ่งไม่ตรง Requirement UUID Primary Key ใหม่

## เป้าหมาย

ออกแบบ PostgreSQL/Supabase สำหรับระบบติดตามทรัพย์สินภาคสนามแบบ Multi-Partner รองรับมากกว่า 10 ล้านรายการ โดยคง Tenant Isolation, Referential Integrity, Auditability และการขยายระบบในอนาคต

## หลักการสำคัญ

1. `partner_id` เป็น Tenant Boundary ของข้อมูลธุรกิจทุกโมดูล
2. ใช้ `bigint identity` เป็น Physical PK เพื่อประสิทธิภาพของ Index และใช้ UUID เป็น Public ID
3. Foreign Key ของข้อมูลข้ามโมดูลใช้ `(partner_id, id)` เพื่อบังคับไม่ให้เชื่อมข้อมูลข้าม Partner
4. ตารางธุรกรรมปริมาณสูงแบ่ง Hash Partition 32 ส่วนตาม `partner_id`
5. History, Logs และ Audit แบ่ง Range Partition รายเดือน
6. ใช้ Cursor Pagination ด้วยคอลัมน์ลำดับ เช่น `(created_at, id)` แทน Offset ขนาดใหญ่
7. Audit และ Entity History เป็น Append-only
8. RLS ถูกเปิดแบบ Fail-closed แต่ยังไม่มี Access Policy จนกว่า Role Matrix จะได้รับอนุมัติ
9. PII ไม่เก็บเป็น Plaintext ในช่องค้นหา: ใช้ encrypted value และ deterministic hash แยกกัน
10. สูตร KPI และ Commission เก็บเป็น Versioned Configuration ไม่ Hardcode ใน Schema

## Module Catalog

| Module        | PostgreSQL schema   | ตารางหลัก                                                            | หน้าที่                                      |
| ------------- | ------------------- | -------------------------------------------------------------------- | -------------------------------------------- |
| Users         | `iam`               | `users`, `memberships`                                               | ตัวตนผู้ใช้และสมาชิกของ Partner              |
| Roles         | `iam`               | `roles`, `permissions`, `role_permissions`, `membership_roles`       | RBAC แบบมี Tenant Scope                      |
| Partners      | `partner`           | `partners`, `branches`                                               | Tenant, Partner config และสาขา               |
| Customers     | `crm`               | `customers`, `customer_contacts`, `customer_addresses`               | ลูกค้า ช่องทางติดต่อ และที่อยู่              |
| Contracts     | `recovery`          | `contracts`, `contract_balance_history`                              | สัญญาและประวัติยอดคงเหลือ                    |
| Cases         | `recovery`          | `cases`, `case_status_history`, `case_notes`                         | เคสติดตามและ Lifecycle                       |
| Agents        | `workforce`         | `agents`                                                             | เจ้าหน้าที่ภาคสนาม                           |
| Assignments   | `workforce`         | `assignments`                                                        | การมอบหมายและประวัติงาน                      |
| KPI           | `performance`       | `kpi_definitions`, `kpi_targets`, `kpi_events`, `kpi_period_results` | KPI แบบ Event-based และ Versioned            |
| Commission    | `performance`       | `commission_plans`, `commission_runs`, `commission_items`            | คำนวณ ตรวจ และล็อกค่าคอมมิชชั่น              |
| Payments      | `finance`           | `payments`                                                           | รายการชำระและการอ้างอิงเคส/สัญญา             |
| Notifications | `communication`     | `notifications`                                                      | Queue, Retry และ Idempotency ของการแจ้งเตือน |
| Documents     | `document_store`    | `documents`                                                          | Metadata ของไฟล์ใน Supabase Storage          |
| History       | `audit`, `recovery` | `entity_history`, `case_status_history`                              | ประวัติ Entity และสถานะเคส                   |
| Logs          | `audit`             | `system_logs`                                                        | Structured operational logs                  |
| Audit         | `audit`             | `audit_events`                                                       | Security/business audit แบบ Append-only      |

## ความสัมพันธ์หลัก

- 1 Partner → หลาย Branch, Membership, Customer, Contract, Case และ Agent
- 1 User → หลาย Membership และทำงานข้าม Partner ได้เมื่อได้รับสิทธิ์
- 1 Customer → หลาย Contract
- 1 Contract → หลาย Case และหลาย Payment
- 1 Case → หลาย Assignment แต่มี Active Assignment ได้หนึ่งรายการในเวลาเดียวกัน
- 1 Agent → หลาย Assignment, KPI Event และ Commission Item
- 1 KPI Definition → หลาย Target, Event และ Period Result
- 1 Commission Plan → หลาย Calculation Run → หลาย Commission Item
- Document ผูกกับ Customer, Contract, Case, Assignment, Payment หรือ Commission Item ตาม Scope

## Strategy สำหรับข้อมูลมากกว่า 10 ล้านรายการ

### Hash partition 32 ส่วน

ใช้กับ `customers`, `contracts`, `cases`, `assignments`, `kpi_events`, `commission_items`, `payments`, `notifications` และ `documents` เพื่อกระจาย Index และทำ Partner-scoped query ได้เร็ว

### Monthly range partition

ใช้กับ `case_status_history`, `entity_history`, `system_logs` และ `audit_events` เพื่อรองรับ Retention, Archive และ Partition Pruning ตามเวลา

Migration สร้าง Partition ตั้งแต่เดือนก่อนหน้าไปจนถึง 12 เดือนข้างหน้า พร้อม Default Partition เป็น Safety Net ต้องมี Maintenance Job สร้างเดือนถัดไปก่อน Default Partition มีข้อมูลในช่วงนั้น

### Index policy

- B-tree composite index สำหรับ Partner + Status + Time + ID
- Partial index สำหรับ Open Case, Pending Payment, Active Assignment และ Delivery Queue
- GIN Trigram สำหรับค้นชื่อลูกค้า
- BRIN สำหรับตาราง Log/History ที่เรียงตามเวลา
- Unique index สำหรับ External Reference และ Idempotency Key
- ไม่สร้าง Index บน JSONB ทั้งหมดจนกว่าจะมี Query Pattern ที่ยืนยันแล้ว

## Security

- Foreign Key แบบ Tenant-aware ป้องกัน Cross-partner reference
- RLS เปิดและ Force บน Tenant Tables
- Access Policies ยังไม่ถูกสร้างเพื่อให้ระบบปิดการเข้าถึงโดยค่าเริ่มต้น
- Supabase service role ต้องอยู่เฉพาะ Trusted Server/Worker
- Storage object ต้องเป็น Private Bucket และออก Signed URL อายุสั้น
- `value_encrypted` และ `address_encrypted` เป็น Ciphertext; Key ต้องอยู่ใน KMS/Secret Manager
- `national_id_hash` และ `value_hash` ใช้ค้นหาแบบ Exact Match โดยไม่เปิด Plaintext
- Audit tables ป้องกัน UPDATE/DELETE ด้วย Trigger

## สิ่งที่ยังไม่รวม

- API, Route Handler, Server Action หรือ Business Logic
- Supabase Auth JWT/RLS Policies ฉบับสมบูรณ์
- Seed ของ Role และ Permission
- KPI/Commission calculation engine
- Storage bucket policy
- Dashboard materialized views
- Data import mapping ของ Partner รายใดรายหนึ่ง

## ไฟล์ที่เกี่ยวข้อง

- DDL: `database/migrations/0001_paysave_recovery_foundation.sql`
- ERD: `docs/database/PAYSAVE_Recovery_ERD_v1.1.mmd`
- Checklist: `docs/database/PAYSAVE_Recovery_PreMigration_Checklist_v1.1.md`
