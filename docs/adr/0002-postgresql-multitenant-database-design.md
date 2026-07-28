# ADR-0002: Multi-Partner PostgreSQL Data Architecture

- **Status:** Accepted — Database Gate v2.1 Approved 2026-07-21
- **Date:** 2026-07-20
- **Decision owners:** PAYSAVE OS Database Architecture
- **Current review artifact:** `docs/database/PAYSAVE_Recovery_Database_Design_v2.1.md`

## Context

PAYSAVE OS เป็น Field Recovery Management System ที่ต้องรองรับผู้ใช้มากกว่า 10,000 คน เคสมากกว่า 10 ล้านเคส หลาย Partner หลาย Role และข้อมูลธุรกรรม/ประวัติปริมาณสูง โดยต้องรักษา Tenant Isolation, Auditability และรองรับการเติบโตโดยไม่เริ่มด้วย Microservices

## Decision

1. ใช้ PostgreSQL แยก Logical Schema ตาม Domain
2. Entity Key เป็น UUID; แนะนำ UUIDv7 เพื่อ Index locality เมื่อ Runtime รองรับ
3. `partner_id` เป็น Tenant Boundary ของทุกข้อมูลธุรกิจ
4. FK ระหว่างข้อมูล Tenant ใช้คู่ `(partner_id, entity_id)` เพื่อป้องกัน Cross-partner reference
5. ตารางทั่วไปใช้ `id uuid` เป็น Primary Key; ตาราง Partition ใช้ Composite Primary Key ที่รวม Partition Key และ UUID ตามข้อจำกัด PostgreSQL
6. `cases` และ `assignments` เริ่มจาก indexed non-partitioned design และเลือก Hash/Range strategy หลัง Benchmark Partner skew; Time-series Event/Audit ใช้ Monthly Range Partition ส่วน `entity_history` ใช้ Entity-identity Hash Partition เพื่อบังคับ version uniqueness ข้ามเวลา
7. History/Audit/Timeline เป็น Append-only และแยกจาก Current State
8. Attachment ใช้ Metadata ใน PostgreSQL และ Binary Object ใน Private Object Storage พร้อม Explicit Link Tables
9. KPI และ Commission ใช้ Versioned Configuration; Database ไม่ Hardcode สูตรคำนวณ
10. Migration ใช้ Forward-only, Expand/Contract และ Approval Gate ก่อนสร้าง SQL
11. Logical Design v2.1 มี 21 Domain และ 161 Logical Tables: 67 baseline + 94 P0 additions จาก Stage 2.5
12. Approval, Workflow และ SLA ใช้ `workflow.business_objects` เป็น Supertype Identity ของ Subject ข้าม Domain; Typed Aggregate Root ถือ Tenant-aware FK กลับมาที่ Identity นี้
13. Master Data, Workflow Definition, Approval Policy, SLA Policy, AI Model/Prompt, Report Definition และ Enterprise Event Contract เป็น Versioned Control Plane; Published Version เป็น Immutable
14. Warehouse ใน v2.1 หมายถึง Physical Recovered-Asset Custody; Analytical output อยู่ Report Domain และยังไม่ออกแบบ Analytical Warehouse
15. AI ใช้ Human-in-the-loop, เก็บ Model/Prompt/Input/Output lineage และห้าม AI อนุมัติ Business Action ของตนเอง

## Consequences

### Positive

- Tenant-aware FK ลดความเสี่ยงข้อมูลข้าม Partner
- UUID รองรับการสร้างรหัสแบบกระจายและไม่เปิดเผยลำดับธุรกิจ
- Partition pruning และ Local Index รองรับข้อมูลขนาดใหญ่
- Append-only history ช่วย Audit และ Reconstruction
- Domain schema พร้อมแยกบริการในอนาคตโดยไม่ผูกตั้งแต่ต้น

### Trade-offs

- Composite PK บน Partitioned Table ซับซ้อนกว่า UUID-only PK
- UUIDv7 generator ต้องเลือกและยืนยันในขั้น Implementation
- Partition maintenance, retention และ archive ต้องมี Operational Job
- RLS/Role Policy ต้องออกแบบต่อหลัง Role Matrix ได้รับอนุมัติ
- ประสิทธิภาพ 10M+ ยังต้องพิสูจน์ด้วยข้อมูลจำลองและ `EXPLAIN (ANALYZE, BUFFERS)`

## Rejected alternatives

- **Bigint physical PK + UUID public ID:** ไม่ตรง Requirement ที่กำหนด UUID Primary Key
- **Database-per-partner:** Operational overhead สูงเกิน Stage ปัจจุบัน
- **Shared tables without partner-aware FK:** ป้องกัน Cross-tenant reference ไม่ได้ในระดับฐานข้อมูล
- **One generic attachment link with polymorphic FK:** PostgreSQL บังคับ Referential Integrity ไม่ได้
- **Partition ทุกตารางทันที:** เพิ่มความซับซ้อนโดยไม่มีประโยชน์กับตารางขนาดเล็ก

## Approval record

Decision Owner approved Database Gate v2.1 on 2026-07-21, including the 21-domain/161-table Logical Design, Aggregate Map, Relationship Matrix, Enterprise Event Catalog, Permission/SoD Boundary, physical-custody Warehouse interpretation, tenant/UUID/FK policies and benchmark-gated scale strategy. Physical schema work remains governed by Architecture Freeze Report v1.0 and Stage 3 controls.
